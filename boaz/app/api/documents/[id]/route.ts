// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const session = await getServerSession(authOptions);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document || document.deletedAt) {
      return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
    }

    // Incrémenter le compteur de vues
    await prisma.document.update({
      where: { id: documentId },
      data: { viewCount: { increment: 1 } },
    });

    // Vérifier si l'utilisateur a déjà acheté ce document
    let hasPurchased = false;
    let purchaseToken = null;

    if (session?.user) {
      const purchase = await prisma.purchase.findUnique({
        where: {
          userId_documentId: {
            userId: session.user.id,
            documentId: documentId,
          },
        },
        select: {
          purchaseToken: true,
        },
      });

      if (purchase) {
        hasPurchased = true;
        purchaseToken = purchase.purchaseToken;
      }
    }

    // Ne pas exposer les informations sensibles
    const { encryptionKey, checksum, ...safeDocument } = document;

    return NextResponse.json({
      ...safeDocument,
      hasPurchased,
      purchaseToken,
    });
  } catch (error) {
    console.error("Erreur récupération document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le propriétaire ou admin
    if (document.sellerId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer ce document" },
        { status: 403 }
      );
    }

    // Soft delete
    await prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Document supprimé" });
  } catch (error) {
    console.error("Erreur suppression document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = updateSchema.parse(await req.json());

    const existing = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, sellerId: true, deletedAt: true },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
    }

    if (existing.sellerId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        publishedAt: body.action === "publish" ? new Date() : null,
      },
      select: {
        id: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        ...updated,
        isDraft: !updated.publishedAt,
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour document:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Action invalide", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du document" },
      { status: 500 }
    );
  }
}
