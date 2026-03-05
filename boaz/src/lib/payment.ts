// lib/payment.ts
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

const getStripeClient = () => {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY est manquant");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover",
  });

  return stripeClient;
};

/**
 * Crée une session de paiement Stripe
 */
export async function createStripeCheckoutSession(
  documentId: string,
  userId: string,
  amount: number,
  currency: string = "usd",
  metadata?: Record<string, string>
) {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: "Document Purchase",
            description: `Document ID: ${documentId}`,
          },
          unit_amount: Math.round(amount * 100), // Stripe utilise les centimes
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXTAUTH_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/documents/${documentId}`,
    metadata: {
      documentId,
      userId,
      ...metadata,
    },
    customer_email: metadata?.email,
  });

  return session;
}

/**
 * Vérifie le statut d'une session Stripe
 */
export async function verifyStripeSession(sessionId: string) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    status: session.payment_status,
    metadata: session.metadata,
    amount: session.amount_total,
    currency: session.currency,
  };
}

/**
 * Crée un remboursement Stripe
 */
export async function createStripeRefund(paymentIntentId: string, reason?: string) {
  const stripe = getStripeClient();
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: reason as "duplicate" | "fraudulent" | "requested_by_customer" | undefined,
  });
  return refund;
}

// Fedapay pour l'Afrique de l'Ouest
interface FedapayConfig {
  apiKey: string;
  environment: "sandbox" | "live";
}

class FedapayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: FedapayConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl =
      config.environment === "sandbox"
        ? "https://sandbox-api.fedapay.com/v1"
        : "https://api.fedapay.com/v1";
  }

  private ensureApiKey() {
    if (!this.apiKey) {
      throw new Error("FEDAPAY_SECRET_KEY est manquant");
    }
  }

  /**
   * Crée une transaction Fedapay
   */
  async createTransaction(
    amount: number,
    currency: string = "XOF",
    description: string,
    metadata: Record<string, string>
  ) {
    this.ensureApiKey();
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        amount,
        currency: {
          iso: currency,
        },
        callback_url: `${process.env.NEXTAUTH_URL}/api/purchase/fedapay-callback`,
        custom_metadata: metadata,
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la transaction Fedapay");
    }

    return await response.json();
  }

  /**
   * Génère un token de paiement
   */
  async generateToken(transactionId: string) {
    this.ensureApiKey();
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/token`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la génération du token");
    }

    return await response.json();
  }

  /**
   * Vérifie le statut d'une transaction
   */
  async verifyTransaction(transactionId: string) {
    this.ensureApiKey();
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la vérification de la transaction");
    }

    return await response.json();
  }
}

export const fedapay = new FedapayClient({
  apiKey: process.env.FEDAPAY_SECRET_KEY || "",
  environment: process.env.NODE_ENV === "production" ? "live" : "sandbox",
});
