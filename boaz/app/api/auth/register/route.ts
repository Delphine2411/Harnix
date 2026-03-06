// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    role: z.enum(["user", "seller"]).default("user"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validatedData = registerSchema.parse(body);

        // Vérifier si l'email existe déjà
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Cet email est déjà utilisé" },
                { status: 400 }
            );
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                role: validatedData.role,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json(
            { message: "Compte créé avec succès", user },
            { status: 201 }
        );
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Données invalides", details: error.issues },
                { status: 400 }
            );
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return NextResponse.json(
                    { error: "Cet email est déjà utilisé" },
                    { status: 400 }
                );
            }

            if (error.code === "P2021") {
                return NextResponse.json(
                    { error: "Base de données non initialisée (migration manquante)" },
                    { status: 503 }
                );
            }

            if (error.code === "P1001") {
                return NextResponse.json(
                    { error: "Base de données inaccessible" },
                    { status: 503 }
                );
            }
        }

        console.error("Erreur lors de l'inscription:", error);
        return NextResponse.json(
            { error: "Erreur lors de la création du compte" },
            { status: 500 }
        );
    }
}
