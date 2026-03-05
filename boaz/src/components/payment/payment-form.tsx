// components/PaymentForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";


interface PaymentFormProps {
  documentId: string;
  price: number;
  currency: string;
  shareToken?: string;
}

export default function PaymentForm({
  documentId,
  price,
  currency,
  shareToken,
}: PaymentFormProps) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "fedapay" | "simulation">("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError("");

      const endpoint = paymentMethod === "simulation"
        ? "/api/purchase/simulate"
        : "/api/purchase/initiate";

      // Initier le paiement
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          paymentMethod,
          shareToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du traitement");
      }

      const data = await response.json();

      if (paymentMethod === "simulation") {
        router.refresh(); // Rafraîchir la page pour voir les changements
      } else {
        // Rediriger vers la page de paiement externe
        window.location.href = data.url;
      }
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h3 className="text-xl font-semibold mb-4">Finaliser l&apos;achat</h3>

      {/* Résumé */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Prix</span>
          <span className="font-semibold text-lg">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: currency,
            }).format(price)}
          </span>
        </div>
      </div>

      {/* Sélection du mode de paiement */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Mode de paiement
        </label>
        <div className="space-y-3">
          {process.env.NODE_ENV === "development" && (
            <label className="flex items-center p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg cursor-pointer hover:border-yellow-400 transition-colors">
              <input
                type="radio"
                name="paymentMethod"
                value="simulation"
                checked={paymentMethod === "simulation"}
                onChange={(e) => setPaymentMethod(e.target.value as "simulation")}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium text-yellow-800">Simulation</div>
                <div className="text-sm text-yellow-600">Mode test (Achat instantané sans paiement)</div>
              </div>
              <div className="text-2xl">🧪</div>
            </label>
          )}

          <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="stripe"
              checked={paymentMethod === "stripe"}
              onChange={(e) => setPaymentMethod(e.target.value as "stripe")}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">Carte bancaire</div>
              <div className="text-sm text-gray-500">Via Stripe (Visa, Mastercard)</div>
            </div>
            <div className="flex space-x-2">
              <Image src="/icons/visa.svg" alt="Visa" width={36} height={24} className="h-6 w-auto" />
              <Image src="/icons/mastercard.svg" alt="Mastercard" width={36} height={24} className="h-6 w-auto" />
            </div>
          </label>

          <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="fedapay"
              checked={paymentMethod === "fedapay"}
              onChange={(e) => setPaymentMethod(e.target.value as "fedapay")}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">Mobile Money</div>
              <div className="text-sm text-gray-500">
                Via Fedapay (MTN, Moov, Orange)
              </div>
            </div>
            <Image src="/icons/fedapay.png" alt="Fedapay" width={72} height={24} className="h-6 w-auto" />
          </label>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Bouton de paiement */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
      >
        {loading ? "Redirection..." : `Payer ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: currency,
        }).format(price)}`}
      </button>

      {/* Sécurité */}
      <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Paiement 100% sécurisé
      </div>
    </div>
  );
}

