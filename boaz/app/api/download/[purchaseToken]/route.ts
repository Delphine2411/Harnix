// app/api/download/[purchaseToken]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import {
  decryptDocumentKey,
  decryptFile,
  verifyFileChecksum,
  addWatermarkToPDF,
} from "@/src/lib/encryption";
import { downloadFile } from "@/src/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ purchaseToken: string }> }
) {
  try {
    const { purchaseToken } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer l'achat
    const purchase = await prisma.purchase.findUnique({
      where: { purchaseToken },
      include: {
        document: true,
        user: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Token d'achat invalide" },
        { status: 404 }
      );
    }

    // Vérifier que c'est bien l'utilisateur qui a acheté
    if (purchase.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à télécharger ce document" },
        { status: 403 }
      );
    }

    // Vérifier l'expiration si définie
    if (purchase.expiresAt && new Date() > purchase.expiresAt) {
      return NextResponse.json(
        { error: "Votre licence pour ce document a expiré" },
        { status: 410 }
      );
    }

    // Vérifier le nombre de téléchargements
    if (purchase.downloadCount >= purchase.maxDownloads) {
      return NextResponse.json(
        { error: "Vous avez atteint le nombre maximum de téléchargements" },
        { status: 429 }
      );
    }

    // Récupérer l'ID de l'appareil depuis les headers
    const deviceId = req.headers.get("x-device-id") || "unknown";

    // Vérifier le nombre d'appareils
    if (!purchase.deviceIds.includes(deviceId)) {
      if (purchase.deviceIds.length >= purchase.maxDevices) {
        return NextResponse.json(
          { error: "Vous avez atteint le nombre maximum d'appareils autorisés" },
          { status: 429 }
        );
      }

      // Ajouter le nouvel appareil
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          deviceIds: {
            push: deviceId,
          },
        },
      });
    }

    // Télécharger le fichier chiffré depuis S3
    const encryptedBuffer = await downloadFile(purchase.document.fileUrl);

    // Déchiffrer la clé du document
    const documentKey = decryptDocumentKey(purchase.document.encryptionKey);

    // Déchiffrer le fichier
    const decryptedBuffer = decryptFile(encryptedBuffer, documentKey);

    // Vérifier l'intégrité
    const isValid = verifyFileChecksum(decryptedBuffer, purchase.document.checksum);
    if (!isValid) {
      throw new Error("Fichier corrompu");
    }

    // Ajouter le watermark pour les PDFs
    let finalBuffer = decryptedBuffer;
    if (purchase.document.fileType === "pdf") {
      finalBuffer = await addWatermarkToPDF(
        decryptedBuffer,
        purchase.user.email!,
        purchaseToken
      );
    }

    // Mettre à jour les statistiques
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        downloadCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    // Logger le téléchargement
    await prisma.downloadLog.create({
      data: {
        purchaseToken,
        deviceId,
        deviceInfo: req.headers.get("user-agent") || undefined,
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      },
    });

    // Retourner le fichier
    return new NextResponse(finalBuffer, {
      headers: {
        "Content-Type": `application/${purchase.document.fileType}`,
        "Content-Disposition": `attachment; filename="${purchase.document.title}.${purchase.document.fileType}"`,
        "Content-Length": finalBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Erreur téléchargement:", error);
    return NextResponse.json(
      { error: "Erreur lors du téléchargement du document" },
      { status: 500 }
    );
  }
}

