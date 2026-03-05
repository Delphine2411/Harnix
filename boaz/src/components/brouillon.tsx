import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import Link from "next/link";
import { prisma } from "@/src/lib/db";
import DocumentCard from "@/src/components/payment/document-card";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const documents = await prisma.document.findMany({
    where: {
      deletedAt: null,
      publishedAt: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentsForCards = (documents as any[]).map((doc) => ({
    id: doc.id,
    title: doc.title,
    description: doc.description,
    preview: doc.preview,
    price: Number(doc.price),
    currency: doc.currency,
    coverImageUrl: doc.coverImageUrl ?? undefined,
    author: doc.author ?? undefined,
    category: doc.category ?? undefined,
    viewCount: doc.viewCount,
    purchaseCount: doc.purchaseCount,
  }));

  const userPurchases = new Map<string, string>();
  if (session?.user?.id) {
    const purchases = await prisma.purchase.findMany({
      where: { userId: session.user.id },
      select: {
        documentId: true,
        purchaseToken: true,
      },
    });

    purchases.forEach((purchase: { documentId: string; purchaseToken: string }) => {
      userPurchases.set(purchase.documentId, purchase.purchaseToken);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header / Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              B
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tight">BOAZ</span>
          </Link>

          <nav className="flex items-center space-x-4">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center"
              >
                Mon Compte
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-gray-600 font-bold hover:text-blue-600 transition-colors px-4 py-2"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md shadow-gray-200"
                >
                  S&apos;inscrire
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight">
              Vendez et achetez des documents
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"> en toute sécurité</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              La plateforme de référence pour commercialiser vos documents avec un contrôle total : chiffrement de bout en bout et watermarking dynamique.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                href="/documents"
                className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 scale-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                Explorer la bibliothèque
              </Link>
              {/*<Link
                href="/dashboard/upload"
                className="w-full sm:w-auto bg-white text-gray-900 px-10 py-4 rounded-2xl text-lg font-bold border-2 border-gray-100 hover:border-blue-600 hover:text-blue-600 transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                Vendre mes documents
              </Link>*/}
            </div>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
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
              </div>
              <h3 className="text-xl font-semibold mb-2 dark:text-white">Sécurité maximale</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tous les documents sont chiffrés. Chaque achat génère une licence
                unique avec watermarking automatique.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Lecture hors ligne</h3>
              <p className="text-gray-600">
                Téléchargez vos documents et lisez-les même sans connexion grâce à
                notre application PWA installable.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Partage contrôlé</h3>
              <p className="text-gray-600">
                Partagez vos documents en toute sécurité. Le destinataire doit
                acheter le document avant d&apos;y accéder.
              </p>
            </div>
          </div>
        </div>

        {/* Documents récents */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  Derniers documents
                </h2>
                <p className="text-gray-600 mt-2">
                  Découvrez les publications les plus récentes.
                </p>
              </div>
              <Link
                href="/documents"
                className="shrink-0 bg-white text-gray-900 px-5 py-2.5 rounded-xl font-bold border border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-colors"
              >
                Voir plus
              </Link>
            </div>

            {documentsForCards.length > 0 ? (
              <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-6">
                {documentsForCards.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    hasPurchased={userPurchases.has(doc.id)}
                    purchaseToken={userPurchases.get(doc.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
                Aucun document publié pour le moment.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold">
                B
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight">BOAZ</span>
            </div>

            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Boaz. Tous droits réservés.
            </p>

            <div className="flex items-center space-x-6">
              <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">Conditions</Link>
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">Confidentialité</Link>
              <Link href="/contact" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
