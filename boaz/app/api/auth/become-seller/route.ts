import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Vous devez être connecté pour effectuer cette action." },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Mettre à jour le rôle de l'utilisateur en "seller"
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: "seller" },
        });

        return NextResponse.json({
            message: "Félicitations ! Vous êtes maintenant un vendeur.",
            user: {
                id: updatedUser.id,
                role: updatedUser.role,
            },
        });
    } catch (error) {
        console.error("Erreur become-seller API:", error);
        return NextResponse.json(
            { error: "Une erreur est survenue lors de la mise à jour de votre profil." },
            { status: 500 }
        );
    }
}
