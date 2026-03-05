// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import crypto from "crypto";
import { MailerAuthError, MailerConfigError, sendEmail } from "@/src/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Ne pas révéler si l'utilisateur existe ou non (sécurité)
    if (!user) {
      return NextResponse.json(
        { message: "Si l'email existe, un lien a été envoyé" },
        { status: 200 }
      );
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString("hex");
    // const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure

    // Sauvegarder le token (vous devrez ajouter ces champs au modèle User)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // resetToken,
        // resetTokenExpiry,
      },
    });

    // Envoyer l'email
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    await sendEmail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Réinitialisation de votre mot de passe",
      html: `
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px;">
          Réinitialiser mon mot de passe
        </a>
        <p style="margin-top: 20px; color: #666;">Ce lien expire dans 1 heure.</p>
        <p style="color: #666;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      `,
    });

    return NextResponse.json(
      { message: "Email envoyé avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur forgot password:", error);

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
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}
