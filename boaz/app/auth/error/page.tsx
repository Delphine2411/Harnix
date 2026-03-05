// app/auth/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "Il y a un problème avec la configuration du serveur.";
      case "AccessDenied":
        return "Vous n'avez pas les permissions nécessaires.";
      case "Verification":
        return "Le lien de vérification a expiré ou a déjà été utilisé.";
      case "OAuthSignin":
        return "Erreur lors de la connexion avec le fournisseur.";
      case "OAuthCallback":
        return "Erreur lors du callback OAuth.";
      case "OAuthCreateAccount":
        return "Impossible de créer le compte OAuth.";
      case "EmailCreateAccount":
        return "Impossible de créer le compte email.";
      case "Callback":
        return "Erreur lors du callback d'authentification.";
      case "OAuthAccountNotLinked":
        return "Ce compte email existe déjà avec un autre fournisseur.";
      case "EmailSignin":
        return "Impossible d'envoyer l'email de connexion.";
      case "CredentialsSignin":
        return "Email ou mot de passe incorrect.";
      default:
        return "Une erreur d'authentification est survenue.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Icône d'erreur */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Erreur d&apos;authentification
            </h1>
            <p className="text-gray-600">{getErrorMessage(error)}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Réessayer de se connecter
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-700 text-center py-3 px-4 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
   
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

