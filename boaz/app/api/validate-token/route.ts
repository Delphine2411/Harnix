// app/api/validate-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { decryptDocumentKey } from "@/src/lib/encryption";
import { z } from "zod";
import { resolveStaticAssetUrl } from "@/src/lib/utils";

const validateSchema = z.object({
  purchaseToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { purchaseToken } = validateSchema.parse(body);
    const deviceId = req.headers.get("x-device-id") || "unknown";

    const purchase = await prisma.purchase.findUnique({
      where: { purchaseToken },
      include: {
        document: true,
      },
    });

    if (!purchase || purchase.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Token invalide" },
        { status: 403 }
      );
    }

    // Verrouillage par appareil (même logique que le téléchargement)
    if (!purchase.deviceIds.includes(deviceId)) {
      if (purchase.deviceIds.length >= purchase.maxDevices) {
        return NextResponse.json(
          { error: "Vous avez atteint le nombre maximum d'appareils autorisés" },
          { status: 429 }
        );
      }

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          deviceIds: {
            push: deviceId,
          },
        },
      });
    }

    // Vérifier l'expiration
    if (purchase.expiresAt && new Date() > purchase.expiresAt) {
      return NextResponse.json(
        { error: "Licence expirée" },
        { status: 410 }
      );
    }

    // Déchiffrer la clé si le document est chiffré
    const documentKey = purchase.document.encryptionKey === "none"
      ? "none"
      : decryptDocumentKey(purchase.document.encryptionKey);

    // Logger l'accès
    await prisma.accessLog.create({
      data: {
        purchaseToken,
        action: "view",
        deviceId,
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      },
    });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { lastAccessedAt: new Date() },
    });

    return NextResponse.json({
      valid: true,
      decryptionKey: documentKey,
      documentUrl: resolveStaticAssetUrl(purchase.document.fileUrl),
      document: {
        title: purchase.document.title,
        author: purchase.document.author,
        pageCount: purchase.document.pageCount,
      },
    });
  } catch (error) {
    console.error("Erreur validation token:", error);
    return NextResponse.json(
      { error: "Erreur lors de la validation du token" },
      { status: 500 }
    );
  }
}
