// app/api/purchase/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { verifyStripeSession, fedapay } from "@/src/lib/payment";
import { z } from "zod";

const verifySchema = z.object({
  sessionId: z.string().optional(),
  transactionId: z.string().optional(),
  paymentMethod: z.enum(["stripe", "fedapay"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, transactionId, paymentMethod } = verifySchema.parse(body);

    let paymentStatus;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let metadata: any;
    let amount;
    let currency;

    if (paymentMethod === "stripe" && sessionId) {
      const stripeData = await verifyStripeSession(sessionId);
      paymentStatus = stripeData.status === "paid" ? "completed" : "failed";
      metadata = stripeData.metadata;
      amount = (stripeData.amount || 0) / 100;
      currency = stripeData.currency?.toUpperCase();
    } else if (paymentMethod === "fedapay" && transactionId) {
      const fedapayData = await fedapay.verifyTransaction(transactionId);
      paymentStatus = fedapayData.v1.status === "approved" ? "completed" : "failed";
      metadata = fedapayData.v1.custom_metadata;
      amount = fedapayData.v1.amount;
      currency = fedapayData.v1.currency.iso;
    } else {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    if (paymentStatus !== "completed") {
      return NextResponse.json({ error: "Paiement non confirmé" }, { status: 400 });
    }

    const documentId = metadata.documentId;
    const shareToken = metadata.shareToken;

    // Créer l'achat
    const purchase = await prisma.purchase.create({
      data: {
        userId: session.user.id,
        documentId,
        amount,
        currency,
        paymentMethod,
        paymentId: sessionId || transactionId,
        paymentStatus: "completed",
        watermark: session.user.email!,
        shareAttemptId: shareToken
          ? (await prisma.shareAttempt.findUnique({ where: { shareToken } }))?.id
          : undefined,
      },
      include: {
        document: true,
      },
    });

    // Mettre à jour le compteur d'achats
    await prisma.document.update({
      where: { id: documentId },
      data: { purchaseCount: { increment: 1 } },
    });

    // Si c'est via un partage, mettre à jour le statut
    if (shareToken) {
      await prisma.shareAttempt.update({
        where: { shareToken },
        data: {
          status: "purchased",
          completedAt: new Date(),
          toUserId: session.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        purchaseToken: purchase.purchaseToken,
        document: purchase.document,
      },
    });
  } catch (error) {
    console.error("Erreur vérification paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification du paiement" },
      { status: 500 }
    );
  }
}