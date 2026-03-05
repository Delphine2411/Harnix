
// app/api/share/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token;

    const shareAttempt = await prisma.shareAttempt.findUnique({
      where: { shareToken },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            description: true,
            preview: true,
            price: true,
            currency: true,
            coverImageUrl: true,
            author: true,
          },
        },
        fromUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!shareAttempt) {
      return NextResponse.json(
        { error: "Lien de partage invalide" },
        { status: 404 }
      );
    }

    // Vérifier l'expiration
    if (new Date() > shareAttempt.expiresAt) {
      return NextResponse.json(
        { error: "Ce lien de partage a expiré" },
        { status: 410 }
      );
    }

    // Vérifier si déjà acheté
    if (shareAttempt.status === "purchased") {
      return NextResponse.json(
        { error: "Ce document a déjà été acheté via ce lien" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      shareAttempt: {
        id: shareAttempt.id,
        message: shareAttempt.message,
        fromUser: shareAttempt.fromUser,
        expiresAt: shareAttempt.expiresAt,
      },
      document: shareAttempt.document,
    });
  } catch (error) {
    console.error("Erreur récupération partage:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du partage" },
      { status: 500 }
    );
  }
}

