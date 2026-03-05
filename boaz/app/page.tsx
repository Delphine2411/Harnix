import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
//import Link from "next/link";
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
      take: 1,
    });
  
    const documentsForCards = documents.map((doc) => ({
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
  
      purchases.forEach((purchase) => {
        userPurchases.set(purchase.documentId, purchase.purchaseToken);
      });
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
        {/* Background clouds (below books) */}
        <svg
          viewBox="0 0 360 180"
          className="pointer-events-none absolute left-0 top-[310px] hidden w-[360px] md:block"
          aria-hidden="true"
        >
          <path
            d="M120 70c22-14 48-16 72-8 12-18 36-28 58-18 10-12 26-18 44-14 22 6 36 26 36 48H120z"
            fill="none"
            stroke="#2a4d9b"
            strokeWidth="3"
          />
        </svg>
        <svg
          viewBox="0 0 300 190"
          className="pointer-events-none absolute right-0 top-[310px] hidden w-[300px] md:block"
          aria-hidden="true"
        >
          <path
            d="M20 90c20-12 44-14 66-8 10-14 30-22 48-14 12-14 32-18 50-12 22 10 36 30 32 52H20z"
            fill="none"
            stroke="#2a4d9b"
            strokeWidth="3"
          />
        </svg>
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#4a7681]">
            Professional, service, personal, touch
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] text-[#123742] md:text-5xl">
            Built by Pet People,
            <br />
            Made for Peace of Mind
          </h1>
          <p className="mx-auto mt-3 max-w-[580px] text-[12px] leading-relaxed text-[#2f5560]">
            Because your pets deserve more than care — they deserve understanding. This
            is where pet lovers connect with expert guidance and real-time support.
          </p>
          <div className="mt-5 flex justify-center">
            <button className="rounded-full bg-[#0f2f3a] px-5 py-2 text-[11px] font-semibold text-white">
              Book appointment
            </button>
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
          At Nachotopia, we treat your pets like family with expert care that&apos;s
          safe, simple, and stress-free.
        </div>

        {/* Cards */}
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <div className="relative rotate-[-6deg] rounded-[18px] bg-[#8e6bd0] p-4 shadow-[0_12px_18px_rgba(15,47,58,0.18)]">
            <div className="h-28 rounded-[14px] bg-white/70 p-3">
              <svg viewBox="0 0 120 80" className="h-full w-full">
                <rect x="8" y="10" width="40" height="60" rx="6" fill="#f7f7f7" stroke="#0f2f3a" strokeWidth="2" />
                <path d="M60 55c10-10 22-16 38-18" stroke="#0f2f3a" strokeWidth="3" fill="none" />
                <circle cx="86" cy="30" r="8" fill="#f05a7e" />
                <path d="M86 38v18" stroke="#0f2f3a" strokeWidth="3" />
              </svg>
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-white">
              Certified veterinarians and groomers
            </p>
          </div>
          <div className="relative rounded-[18px] bg-[#f2a64d] p-4 shadow-[0_12px_18px_rgba(15,47,58,0.18)]">
            <div className="h-28 rounded-[14px] bg-white/70 p-3">
              <svg viewBox="0 0 120 80" className="h-full w-full">
                <circle cx="30" cy="30" r="12" fill="#f08ab5" />
                <path d="M30 44c10 8 20 12 30 12" stroke="#0f2f3a" strokeWidth="3" fill="none" />
                <rect x="60" y="18" width="40" height="44" rx="8" fill="#ffe1cc" stroke="#0f2f3a" strokeWidth="2" />
                <path d="M68 28h24" stroke="#0f2f3a" strokeWidth="3" />
              </svg>
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-white">
              Flexible bookings and home visits
            </p>
          </div>
          <div className="relative rotate-[6deg] rounded-[18px] bg-[#e35b8e] p-4 shadow-[0_12px_18px_rgba(15,47,58,0.18)]">
            <div className="h-28 rounded-[14px] bg-white/70 p-3">
              <svg viewBox="0 0 120 80" className="h-full w-full">
                <path d="M20 58c10-18 26-26 48-26 20 0 34 8 42 22" stroke="#0f2f3a" strokeWidth="3" fill="none" />
                <circle cx="36" cy="32" r="10" fill="#9bd2f4" />
                <circle cx="70" cy="26" r="10" fill="#ffd166" />
                <rect x="72" y="36" width="30" height="26" rx="6" fill="#f05a7e" />
              </svg>
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-white">
              Manage by expert veterinarians
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
