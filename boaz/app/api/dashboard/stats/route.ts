// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const userId = session.user.id;

    // Statistiques globales
    const [
      totalDocuments,
      publishedDocuments,
      draftDocuments,
      totalRevenue,
      totalSales,
      totalViews,
      recentSales,
      topDocuments,
    ] = await Promise.all([
      // Total de documents
      prisma.document.count({
        where: { sellerId: userId, deletedAt: null },
      }),

      // Documents publiés
      prisma.document.count({
        where: {
          sellerId: userId,
          deletedAt: null,
          publishedAt: { not: null },
        },
      }),

      // Brouillons
      prisma.document.count({
        where: {
          sellerId: userId,
          deletedAt: null,
          publishedAt: null,
        },
      }),

      // Revenu total
      prisma.purchase.aggregate({
        where: {
          document: { sellerId: userId },
          paymentStatus: "completed",
        },
        _sum: { amount: true },
      }),

      // Total de ventes
      prisma.purchase.count({
        where: {
          document: { sellerId: userId },
          paymentStatus: "completed",
        },
      }),

      // Total de vues
      prisma.document.aggregate({
        where: { sellerId: userId, deletedAt: null },
        _sum: { viewCount: true },
      }),

      // Ventes récentes (7 derniers jours)
      prisma.purchase.findMany({
        where: {
          document: { sellerId: userId },
          paymentStatus: "completed",
          purchasedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          document: {
            select: {
              title: true,
              price: true,
              currency: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { purchasedAt: "desc" },
        take: 10,
      }),

      // Documents les plus vendus
      prisma.document.findMany({
        where: {
          sellerId: userId,
          deletedAt: null,
          publishedAt: { not: null },
        },
        orderBy: { purchaseCount: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          purchaseCount: true,
          viewCount: true,
          coverImageUrl: true,
        },
      }),
    ]);

    // Statistiques par mois (6 derniers mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySales = await prisma.$queryRaw<
      Array<{ month: string; sales: number; revenue: number }>
    >`
      SELECT 
        TO_CHAR(p."purchasedAt", 'YYYY-MM') as month,
        COUNT(*)::int as sales,
        SUM(p.amount)::float as revenue
      FROM "Purchase" p
      INNER JOIN "Document" d ON p."documentId" = d.id
      WHERE d."sellerId" = ${userId}
        AND p."paymentStatus" = 'completed'
        AND p."purchasedAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR(p."purchasedAt", 'YYYY-MM')
      ORDER BY month DESC
    `;

    return NextResponse.json({
      overview: {
        totalDocuments,
        publishedDocuments,
        draftDocuments,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalSales,
        totalViews: totalViews._sum.viewCount || 0,
      },
      recentSales,
      topDocuments,
      monthlySales,
    });
  } catch (error) {
    console.error("Erreur récupération stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}

