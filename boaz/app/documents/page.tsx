
// app/documents/page.tsx - Liste des documents
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
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

export default async function DocumentsPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; search?: string }>;
}) {
    const resolvedSearchParams = await searchParams;
    let session = null;
    if (process.env.NEXTAUTH_SECRET) {
        session = await getServerSession(authOptions);
    }

    // Récupérer les documents
    const where: {
        deletedAt: null;
        publishedAt: { not: null };
        category?: string;
        OR?: Array<{
            title?: { contains: string; mode: "insensitive" };
            description?: { contains: string; mode: "insensitive" };
        }>;
    } = {
        deletedAt: null,
        publishedAt: { not: null },
    };

    if (resolvedSearchParams.category) {
        where.category = resolvedSearchParams.category;
    }

    if (resolvedSearchParams.search) {
        where.OR = [
            { title: { contains: resolvedSearchParams.search, mode: "insensitive" } },
            { description: { contains: resolvedSearchParams.search, mode: "insensitive" } },
        ];
    }

    let documents: Awaited<ReturnType<typeof prisma.document.findMany>> = [];
    if (hasDatabaseConfig) {
        try {
            documents = await prisma.document.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    seller: {
                        select: {
                            name: true,
                        },
                    },
                },
            });
        } catch (error) {
            console.error("Chargement des documents impossible:", error);
        }
    } else {
        console.error("Chargement des documents impossible: DATABASE_URL invalide ou absente.");
    }

    const documentsForCards: DocumentCardData[] = documents.map((doc) => ({
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

    // Récupérer les achats de l'utilisateur si connecté
    const userPurchases = new Map();
    if (hasDatabaseConfig && session?.user) {
        try {
            const purchases = await prisma.purchase.findMany({
                where: { userId: session.user.id },
                select: {
                    documentId: true,
                    purchaseToken: true,
                },
            });

            purchases.forEach((p: { documentId: string; purchaseToken: string }) => {
                userPurchases.set(p.documentId, p.purchaseToken);
            });
        } catch (error) {
            console.error("Chargement des achats utilisateur impossible:", error);
        }
    }

    const categories = [
        "Tous",
        "Éducation",
        "Business",
        "Technologie",
        "Santé",
        "Art & Design",
        "Sciences",
        "Littérature",
        "Juridique",
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Documents disponibles
                    </h1>

                    {/* Filtres */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {categories.map((cat) => (
                            <a
                                key={cat}
                                href={cat === "Tous" ? "/documents" : `/documents?category=${cat}`}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${(!resolvedSearchParams.category && cat === "Tous") ||
                                    resolvedSearchParams.category === cat
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                {cat}
                            </a>
                        ))}
                    </div>

                    {/* Recherche */}
                    <form method="GET" className="max-w-md">
                        <input
                            type="search"
                            name="search"
                            defaultValue={resolvedSearchParams.search}
                            placeholder="Rechercher un document..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </form>
                </div>

                {/* Grille de documents */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documentsForCards.map((doc) => (
                        <DocumentCard
                            key={doc.id}
                            document={doc}
                            hasPurchased={userPurchases.has(doc.id)}
                            purchaseToken={userPurchases.get(doc.id)}
                        />
                    ))}
                </div>

                {documents.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">Aucun document trouvé</p>
                    </div>
                )}
            </div>
        </div>
    );
}
