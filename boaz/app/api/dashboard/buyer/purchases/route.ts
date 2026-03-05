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

        const userId = session.user.id;

        const purchasedDocuments = await prisma.purchase.findMany({
            where: {
                userId: userId,
                paymentStatus: "completed",
            },
            include: {
                document: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        coverImageUrl: true,
                        author: true,
                        category: true,
                        publishedAt: true,
                    },
                },
            },
            orderBy: {
                purchasedAt: "desc",
            },
        });

        return NextResponse.json({
            purchases: purchasedDocuments,
        });
    } catch (error) {
        console.error("Erreur récupération achats acheteur:", error);
        return NextResponse.json(
            { error: "Erreur lors de la récupération de vos achats" },
            { status: 500 }
        );
    }
}
