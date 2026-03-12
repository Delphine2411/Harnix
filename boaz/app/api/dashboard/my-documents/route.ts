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
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const publishedFilter =
      status === "draft"
        ? null
        : status === "published"
          ? { not: null }
          : undefined;

    const documents = await prisma.document.findMany({
      where: {
        sellerId: session.user.id,
        deletedAt: null,
        ...(publishedFilter !== undefined ? { publishedAt: publishedFilter } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        preview: true,
        price: true,
        currency: true,
        coverImageUrl: true,
        category: true,
        viewCount: true,
        purchaseCount: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({
      documents: documents.map((doc: any) => ({
        ...doc,
        price: Number(doc.price),
        isDraft: !doc.publishedAt,
      })),
    });
  } catch (error) {
    console.error("Erreur récupération documents vendeur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 }
    );
  }
}
