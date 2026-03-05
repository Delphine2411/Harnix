// app/api/purchase/initiate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { createStripeCheckoutSession, fedapay } from "@/src/lib/payment";
import { z } from "zod";

const initiateSchema = z.object({
  documentId: z.string(),
  paymentMethod: z.enum(["stripe", "fedapay"]),
  shareToken: z.string().optional(), // Si c'est via un partage
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, paymentMethod, shareToken } = initiateSchema.parse(body);

    // Récupérer le document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { seller: true },
    });

    if (!document || document.deletedAt) {
      return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà acheté ce document
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_documentId: {
          userId: session.user.id,
          documentId: documentId,
        },
      },
    });

    if (existingPurchase) {
      return NextResponse.json(
        { error: "Vous avez déjà acheté ce document" },
        { status: 400 }
      );
    }

    const amount = Number(document.price);
    const currency = document.currency;

    let paymentData;

    if (paymentMethod === "stripe") {
      // Créer une session Stripe
      const stripeSession = await createStripeCheckoutSession(
        documentId,
        session.user.id,
        amount,
        currency.toLowerCase(),
        {
          email: session.user.email!,
          shareToken: shareToken || "",
        }
      );

      paymentData = {
        sessionId: stripeSession.id,
        url: stripeSession.url,
      };
    } else {
      // Créer une transaction Fedapay
      const transaction = await fedapay.createTransaction(
        amount,
        currency,
        `Achat du document: ${document.title}`,
        {
          documentId,
          userId: session.user.id,
          shareToken: shareToken || "",
        }
      );

      const token = await fedapay.generateToken(transaction.v1.id);

      paymentData = {
        transactionId: transaction.v1.id,
        token: token.v1.token,
        url: token.v1.url,
      };
    }

    return NextResponse.json({
      success: true,
      paymentMethod,
      ...paymentData,
    });
  } catch (error) {
    console.error("Erreur initiation paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initiation du paiement" },
      { status: 500 }
    );
  }
}

