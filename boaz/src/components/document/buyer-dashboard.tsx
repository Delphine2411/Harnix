"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, ChevronRight, LayoutGrid, List, FileText, Search, Plus } from "lucide-react";

interface Purchase {
    id: string;
    purchaseToken: string;
    purchasedAt: string;
    document: {
        id: string;
        title: string;
        description: string;
        coverImageUrl: string | null;
        author: string | null;
        category: string | null;
    };
}

export default function BuyerDashboard() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchPurchases = async () => {
            try {
                const response = await fetch("/api/dashboard/buyer/purchases");
                const data = await response.json();
                if (data.purchases) {
                    setPurchases(data.purchases);
                }
            } catch (error) {
                console.error("Erreur chargement achats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPurchases();
    }, []);

    const filteredPurchases = purchases.filter((purchase) =>
        purchase.document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.document.author?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">Chargement de votre bibliothèque...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header sections */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Ma Bibliothèque</h2>
                    <p className="text-gray-600">Retrouvez tous vos documents achetés</p>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un document..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 ${viewMode === "grid" ? "bg-gray-100 text-blue-600" : "bg-white text-gray-500 hover:text-gray-700"}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 ${viewMode === "list" ? "bg-gray-100 text-blue-600" : "bg-white text-gray-500 hover:text-gray-700"}`}
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {purchases.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Votre bibliothèque est vide</h3>
                    <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                        Vous n&apos;avez pas encore acheté de document. Parcourez notre catalogue pour trouver ce dont vous avez besoin.
                    </p>
                    <Link
                        href="/documents"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Explorer le catalogue
                        <ChevronRight size={20} className="ml-2" />
                    </Link>
                </div>
            ) : filteredPurchases.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Aucun document ne correspond à votre recherche.</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPurchases.map((purchase) => (
                        <div key={purchase.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                            <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                                {purchase.document.coverImageUrl ? (
                                    <Image
                                        src={purchase.document.coverImageUrl}
                                        alt={purchase.document.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <FileText size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Link
                                        href={`/reader/${purchase.purchaseToken}`}
                                        className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold flex items-center transform translate-y-4 group-hover:translate-y-0 transition-transform"
                                    >
                                        Lire maintenant
                                    </Link>
                                </div>
                            </div>

                            <div className="p-4 flex-grow flex flex-col">
                                <div className="mb-2">
                                    <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                                        {purchase.document.category || "Général"}
                                    </span>
                                </div>
                                <h4 className="font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                                    {purchase.document.title}
                                </h4>
                                <p className="text-sm text-gray-500 mb-4">{purchase.document.author || "Auteur inconnu"}</p>

                                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                                    <div className="flex items-center">
                                        <Clock size={14} className="mr-1" />
                                        {new Date(purchase.purchasedAt).toLocaleDateString("fr-FR")}
                                    </div>
                                    <Link href={`/reader/${purchase.purchaseToken}`} className="text-blue-600 font-bold hover:underline">
                                        Ouvrir
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Document</th>
                                <th className="px-6 py-4">Auteur</th>
                                <th className="px-6 py-4">Date d&apos;achat</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPurchases.map((purchase) => (
                                <tr key={purchase.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden mr-3 flex-shrink-0 relative">
                                                {purchase.document.coverImageUrl ? (
                                                    <Image src={purchase.document.coverImageUrl} alt="" fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <FileText size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{purchase.document.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{purchase.document.author || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(purchase.purchasedAt).toLocaleDateString("fr-FR")}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/reader/${purchase.purchaseToken}`}
                                            className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                                        >
                                            Lire
                                            <ChevronRight size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Become Seller CTA */}
            <div className="bg-gradient-to-br from-gray-900 to-indigo-950 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="max-w-xl">
                        <h3 className="text-2xl font-bold mb-3">Vendez vos propres documents</h3>
                        <p className="text-gray-300">
                            Vous avez une expertise à partager ? Transformez vos connaissances en revenus passifs en devenant vendeur sur Boaz.
                        </p>
                    </div>
                    <Link
                        href="/become-seller"
                        className="flex-shrink-0 px-8 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-blue-50 transition-colors flex items-center"
                    >
                        <Plus size={20} className="mr-2" />
                        Devenir vendeur
                    </Link>
                </div>
            </div>
        </div>
    );
}
