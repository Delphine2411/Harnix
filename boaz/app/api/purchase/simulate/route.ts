import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { z } from "zod";

const simulateSchema = z.object({
    documentId: z.string(),
    shareToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // Sécurité: Uniquement en développement
        if (process.env.NODE_ENV === "production" && session.user.role !== "admin") {
            return NextResponse.json(
                { error: "La simulation est désactivée en production" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { documentId, shareToken } = simulateSchema.parse(body);

        // Récupérer le document
        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document || document.deletedAt) {
            return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
        }

        // Vérifier si déjà acheté
        const existing = await prisma.purchase.findUnique({
            where: {
                userId_documentId: {
                    userId: session.user.id,
                    documentId,
                },
            },
        });

        if (existing) {
            return NextResponse.json({ success: true, message: "Déjà acheté" });
        }

        // Créer l'achat simulé
        await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
            // 1. Créer le record Purchase
            await tx.purchase.create({
                data: {
                    userId: session.user.id,
                    documentId: documentId,
                    amount: document.price,
                    currency: document.currency,
                    paymentMethod: "simulation",
                    paymentStatus: "completed",
                    paymentId: `sim_${Date.now()}`,
                    watermark: session.user.email || session.user.id,
                    shareAttemptId: shareToken ? (await tx.shareAttempt.findUnique({ where: { shareToken } }))?.id : undefined,
                },
            });

            // 2. Incrémenter le compteur d'achats du document
            await tx.document.update({
                where: { id: documentId },
                data: { purchaseCount: { increment: 1 } },
            });

            // 3. Mettre à jour le statut du partage si nécessaire
            if (shareToken) {
                await tx.shareAttempt.update({
                    where: { shareToken },
                    data: {
                        status: "purchased",
                        completedAt: new Date(),
                        toUserId: session.user.id
                    },
                });
            }
        });

        return NextResponse.json({ success: true, message: "Achat simulé avec succès" });
    } catch (error: unknown) {
        console.error("Erreur simulation achat:", error);
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        return NextResponse.json(
            { error: "Erreur lors de la simulation", message },
            { status: 500 }
        );
    }
}
