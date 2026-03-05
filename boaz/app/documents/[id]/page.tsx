// app/documents/[id]/page.tsx - Détails d'un document
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import PaymentForm from "@/src/components/payment/payment-form";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!document || document.deletedAt) {
    notFound();
  }

  // Vérifier si l'utilisateur a déjà acheté
  let purchase = null;
  if (session?.user) {
    purchase = await prisma.purchase.findUnique({
      where: {
        userId_documentId: {
          userId: session.user.id,
          documentId: document.id,
        },
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Informations du document */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              {document.coverImageUrl && (
                <div className="relative w-full h-64 mb-6">
                  <Image
                    src={document.coverImageUrl}
                    alt={document.title}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="mb-4">
                {document.category && (
                  <span className="text-sm font-semibold text-blue-600 uppercase">
                    {document.category}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {document.title}
              </h1>

              {document.author && (
                <p className="text-lg text-gray-600 mb-4">par {document.author}</p>
              )}

              <div className="mb-6 flex items-center space-x-4 text-sm text-gray-500">
                <span>Vendeur: {document.seller.name}</span>
                <span>•</span>
                <span>{document.viewCount} vues</span>
                <span>•</span>
                <span>{document.purchaseCount} achats</span>
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">
                  {document.description}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Aperçu gratuit
                </h3>
                <p className="text-blue-800">{document.preview}</p>
              </div>
            </div>
          </div>

          {/* Sidebar - Achat */}
          <div className="md:col-span-1">
            {purchase ? (
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Vous possédez ce document
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Acheté le {new Date(purchase.purchasedAt).toLocaleDateString()}
                  </p>
                </div>

                <Link
                  href={`/reader/${purchase.purchaseToken}`}
                  className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-md hover:bg-blue-700 mb-3"
                >
                  Lire maintenant
                </Link>

                <div className="text-center text-sm text-gray-500">
                  <p>Téléchargements: {purchase.downloadCount}/{purchase.maxDownloads}</p>
                  <p>Appareils: {purchase.deviceIds.length}/{purchase.maxDevices}</p>
                </div>
              </div>
            ) : session?.user ? (
              <PaymentForm
                documentId={document.id}
                price={Number(document.price)}
                currency={document.currency}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-center text-gray-600 mb-4">
                  Connectez-vous pour acheter ce document
                </p>
                <Link
                  href="/auth/signin"
                  className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-md hover:bg-blue-700"
                >
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}