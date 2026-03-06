import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
//import Link from "next/link";
import { hasDatabaseConfig, prisma } from "@/src/lib/db";
import DocumentCard from "@/src/components/payment/document-card";

type DocumentCardData = {
  id: string;
  title: string;
  description: string;
  preview: string;
  price: number;
  currency: string;
  coverImageUrl?: string;
  author?: string;
  category?: string;
  viewCount: number;
  purchaseCount: number;
};


export default async function HomePage() {
  let session = null;
  let documents: Awaited<ReturnType<typeof prisma.document.findMany>> = [];

  try {
    if (process.env.NEXTAUTH_SECRET) {
      session = await getServerSession(authOptions);
    }
  } catch (error) {
    console.error("Session indisponible:", error);
  }

  if (hasDatabaseConfig) {
    try {
      documents = await prisma.document.findMany({
        where: {
          deletedAt: null,
          publishedAt: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
    } catch (error) {
      console.error("Chargement des documents impossible:", error);
    }
  } else {
    console.error("Chargement des documents impossible: DATABASE_URL invalide ou absente.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentsForCards: DocumentCardData[] = (documents as any[]).map((doc) => ({
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
  if (hasDatabaseConfig && session?.user?.id) {
    try {
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
    } catch (error) {
      console.error("Chargement des achats utilisateur impossible:", error);
    }
  }
  return (
    <div className="min-h-screen bg-[#cfeafe] text-[#123742]">
      {/* Top nav */}
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

      {/* Hero */}
      <div className="relative mx-auto w-full max-w-[980px] px-5 pb-10 pt-10">
        {/* Background book doodles */}
        <svg
          viewBox="0 0 180 120"
          className="pointer-events-none absolute left-0 top-[135px] opacity-50 hidden w-[180px] md:block"
          aria-hidden="true"
        >
          <g transform="translate(10 10)" stroke="#2a4d9b" strokeWidth="3" fill="none">
            <rect x="0" y="10" width="110" height="70" rx="8" />
            <path d="M10 20h40c10 0 20 6 20 16v44H10z" />
            <path d="M100 20H60c-10 0-20 6-20 16v44h60z" />
            <path d="M10 30h30" />
            <path d="M10 42h30" />
            <path d="M10 54h30" />
          </g>
        </svg>
        <svg
          viewBox="0 0 190 130"
          className="pointer-events-none absolute right-0 top-[70px] opacity-50 hidden w-[190px] md:block"
          aria-hidden="true"
        >
          <g transform="translate(10 10) rotate(4)" stroke="#2a4d9b" strokeWidth="3" fill="none">
            <rect x="0" y="10" width="120" height="76" rx="8" />
            <path d="M12 22h44c10 0 20 6 20 16v46H12z" />
            <path d="M108 22H64c-10 0-20 6-20 16v46h64z" />
            <path d="M12 34h32" />
            <path d="M12 48h32" />
            <path d="M12 62h32" />
          </g>
        </svg>
        
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#4a7681]">
            Securite, service, professionnel, fiabilite
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] text-[#123742] md:text-5xl">
          achetez vos documents
            <br />
            en toute securite
          </h1>
          <p className="mx-auto mt-3 max-w-[580px] text-[12px] leading-relaxed text-[#2f5560]">
          La plateforme de référence pour commercialiser vos documents avec un contrôle total : chiffrement de bout en bout et watermarking dynamique.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
                           href="/documents"
                           className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 scale-100 hover:scale-[1.02] active:scale-[0.98]"
                         >
                           Explorer la bibliothèque
                         </Link>
          </div>
        </div>

        {/* Illustration */}
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-[680px] rounded-[18px] border-2 border-[#1a3f49] bg-[#eaf6ff] px-6 py-5 shadow-[0_10px_20px_rgba(15,47,58,0.12)]">

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
        </div>

        {/* Sub copy */}
        <div className="mt-8 text-center text-[13px] font-semibold text-[#2d4d57]">
        Sécurité maximale, Lecture hors ligne, Partage contrôlé
        </div>

        {/* Cards */}
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <div className="relative rotate-[-6deg] rounded-[18px] bg-[#8e6bd0] p-4 shadow-[0_12px_18px_rgba(15,47,58,0.18)]">
            <div className="h-28 rounded-[14px] bg-white/70 p-3">
              <svg viewBox="0 0 120 80" className="h-full w-full">
              <svg
                  className="w-5 h-5 text-blue-600"
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
                
              </svg>
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-white">
            Tous les documents sont chiffrés. Chaque achat génère une licence
            unique avec watermarking automatique.
            </p>
          </div>
          <div className="relative rounded-[18px] bg-[#f2a64d] p-4 shadow-[0_12px_18px_rgba(15,47,58,0.18)]">
            <div className="h-28 rounded-[14px] bg-white/70 p-3">
              <svg viewBox="0 0 120 80" className="h-full w-full">

                <svg
                  className="w-4 h-4 text-green-600"
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
              </svg>
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-white">
            Téléchargez vos documents et lisez-les même sans connexion grâce à
            notre application PWA installable.
            </p>
          </div>
          <div className="relative rotate-[6deg] rounded-[18px] bg-[#e35b8e] p-4 shadow-[0_12px_18px_rgba(15,47,58,0.18)]">
            <div className="h-28 rounded-[14px] bg-white/70 p-3">
              <svg viewBox="0 0 120 80" className="h-full w-full">

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
              </svg>
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-white">
            Partagez vos documents en toute sécurité. Le destinataire doit
            acheter le document avant d&apos;y accéder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
