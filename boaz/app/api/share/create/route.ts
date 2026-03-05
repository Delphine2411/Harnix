// app/api/share/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { z } from "zod";
import { MailerAuthError, MailerConfigError, sendEmail } from "@/src/lib/mailer";

const shareSchema = z.object({
  documentId: z.string(),
  toEmail: z.string().email("Email invalide"),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, toEmail, message } = shareSchema.parse(body);

    // Vérifier que l'utilisateur a bien acheté le document
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_documentId: {
          userId: session.user.id,
          documentId,
        },
      },
      include: {
        document: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Vous devez acheter ce document avant de le partager" },
        { status: 403 }
      );
    }

    // Vérifier si le destinataire a déjà ce document
    const recipientUser = await prisma.user.findUnique({
      where: { email: toEmail },
    });

    if (recipientUser) {
      const existingPurchase = await prisma.purchase.findUnique({
        where: {
          userId_documentId: {
            userId: recipientUser.id,
            documentId,
          },
        },
      });

      if (existingPurchase) {
        return NextResponse.json(
          { error: "Cette personne possède déjà ce document" },
          { status: 400 }
        );
      }
    }

    // Créer la tentative de partage
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    const shareAttempt = await prisma.shareAttempt.create({
      data: {
        fromUserId: session.user.id,
        toEmail,
        documentId,
        message,
        expiresAt,
      },
    });

    // Envoyer l'email
    const shareUrl = `${process.env.NEXTAUTH_URL}/share/${shareAttempt.shareToken}`;

    await sendEmail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `${session.user.name} vous a partagé un document`,
      html: `
        <h2>Partage de document</h2>
        <p>${session.user.name} (${session.user.email}) vous a partagé le document "${purchase.document.title}".</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
        <p>Pour accéder à ce document, vous devez d'abord l'acheter en cliquant sur le lien ci-dessous:</p>
        <a href="${shareUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px;">Acheter le document</a>
        <p style="margin-top: 20px; color: #666;">Ce lien expire le ${expiresAt.toLocaleDateString()}.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      shareAttempt: {
        id: shareAttempt.id,
        shareToken: shareAttempt.shareToken,
        toEmail: shareAttempt.toEmail,
        expiresAt: shareAttempt.expiresAt,
      },
    });
  } catch (error) {
    console.error("Erreur création partage:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof MailerConfigError || error instanceof MailerAuthError) {
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "production"
              ? "Service email temporairement indisponible"
              : error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors du partage du document" },
      { status: 500 }
    );
  }
}
