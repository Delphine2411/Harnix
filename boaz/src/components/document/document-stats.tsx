

// components/DashboardStats.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  DollarSign,
  Eye,
  ShoppingCart,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface Stats {
  overview: {
    totalDocuments: number;
    publishedDocuments: number;
    draftDocuments: number;
    totalRevenue: number;
    totalSales: number;
    totalViews: number;
  };
  recentSales: Array<{
    id: string;
    amount: number;
    purchasedAt: Date;
    document: {
      title: string;
      price: number;
      currency: string;
    };
    user: {
      name: string;
      email: string;
    };
  }>;
  topDocuments: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    purchaseCount: number;
    viewCount: number;
    coverImageUrl?: string;
  }>;
  monthlySales: Array<{
    month: string;
    sales: number;
    revenue: number;
  }>;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) throw new Error("Erreur");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>Erreur de chargement des statistiques</div>;
  }

  const statCards = [
    {
      title: "Documents totaux",
      value: stats.overview.totalDocuments,
      icon: FileText,
      color: "bg-blue-500",
      details: `${stats.overview.publishedDocuments} publiés, ${stats.overview.draftDocuments} brouillons`,
    },
    {
      title: "Revenus totaux",
      value: new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XOF",
      }).format(stats.overview.totalRevenue),
      icon: DollarSign,
      color: "bg-green-500",
      details: `${stats.overview.totalSales} ventes`,
    },
    {
      title: "Vues totales",
      value: stats.overview.totalViews.toLocaleString(),
      icon: Eye,
      color: "bg-purple-500",
      details: "Sur tous vos documents",
    },
    {
      title: "Ventes",
      value: stats.overview.totalSales,
      icon: ShoppingCart,
      color: "bg-orange-500",
      details: "Transactions complétées",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </p>
            <p className="text-xs text-gray-500">{stat.details}</p>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/upload"
          className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors"
        >
          <FileText size={32} className="mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nouveau document</h3>
          <p className="text-sm opacity-90">Créer et publier un nouveau document</p>
        </Link>

        <Link
          href="/dashboard/my-documents?status=draft"
          className="bg-yellow-600 text-white rounded-lg p-6 hover:bg-yellow-700 transition-colors"
        >
          <Calendar size={32} className="mb-4" />
          <h3 className="text-lg font-semibold mb-2">Brouillons</h3>
          <p className="text-sm opacity-90">
            {stats.overview.draftDocuments} document(s) en cours
          </p>
        </Link>

        <Link
          href="/dashboard/my-documents?status=published"
          className="bg-green-600 text-white rounded-lg p-6 hover:bg-green-700 transition-colors"
        >
          <TrendingUp size={32} className="mb-4" />
          <h3 className="text-lg font-semibold mb-2">Documents publiés</h3>
          <p className="text-sm opacity-90">
            {stats.overview.publishedDocuments} document(s) en ligne
          </p>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ventes récentes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Ventes récentes</h2>
          {stats.recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucune vente récente
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {sale.document.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {sale.user.name || sale.user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.purchasedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: sale.document.currency,
                      }).format(sale.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents les plus vendus */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Documents les plus vendus
          </h2>
          {stats.topDocuments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucun document publié
            </p>
          ) : (
            <div className="space-y-4">
              {stats.topDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {doc.coverImageUrl && (
                    <Image
                      src={doc.coverImageUrl}
                      alt={doc.title}
                      width={64}
                      height={80}
                      className="w-16 h-20 object-cover rounded mr-4"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {doc.title}
                    </h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span>{doc.purchaseCount} ventes</span>
                      <span>•</span>
                      <span>{doc.viewCount} vues</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: doc.currency,
                      }).format(doc.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Graphique des ventes mensuelles */}
      {stats.monthlySales.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Évolution des ventes (6 derniers mois)
          </h2>
          <div className="space-y-3">
            {stats.monthlySales.reverse().map((month) => {
              const maxRevenue = Math.max(
                ...stats.monthlySales.map((m) => m.revenue)
              );
              const percentage = (month.revenue / maxRevenue) * 100;

              return (
                <div key={month.month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">
                      {new Date(month.month + "-01").toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                      })}
                    </span>
                    <span className="text-gray-600">
                      {month.sales} vente(s) •{" "}
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "XOF",
                      }).format(month.revenue)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}