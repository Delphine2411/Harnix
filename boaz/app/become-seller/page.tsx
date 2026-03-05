"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldCheck, Rocket, Landmark, ArrowRight, Loader2 } from "lucide-react";

export default function BecomeSellerPage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleBecomeSeller = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/become-seller", {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Une erreur est survenue.");
            }

            // Mettre à jour la session côté client pour refléter le nouveau rôle
            await update({ role: "seller" });

            router.push("/dashboard");
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Propulsez votre expertise
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Rejoignez notre communauté de créateurs et commencez à monétiser vos documents dès aujourd&apos;hui.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                            <Rocket size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Vente instantanée</h3>
                        <p className="text-gray-600 leading-relaxed">
                            Uploadez vos PDF et commencez à vendre en quelques minutes seulement.
                        </p>
                    </div>

                    <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Paiements sécurisés</h3>
                        <p className="text-gray-600 leading-relaxed">
                            Vos revenus sont protégés et versés directement sur votre compte.
                        </p>
                    </div>

                    <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                            <Landmark size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Gestion facilitée</h3>
                        <p className="text-gray-600 leading-relaxed">
                            Un tableau de bord complet pour suivre vos ventes et vos statistiques.
                        </p>
                    </div>
                </div>

                <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
                    <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>

                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-3xl font-bold mb-6">Prêt à devenir vendeur sur Boaz ?</h2>
                        <p className="text-gray-400 mb-10 max-w-xl mx-auto">
                            En cliquant sur le bouton ci-dessous, votre compte sera immédiatement mis à jour et vous aurez accès aux outils de vente.
                        </p>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleBecomeSeller}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors duration-200 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={20} />
                                    Mise à jour...
                                </>
                            ) : (
                                <>
                                    Confirmer et commencer
                                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                                </>
                            )}
                        </button>
                        <p className="mt-6 text-xs text-gray-500">
                            En continuant, vous acceptez nos conditions générales de vente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
