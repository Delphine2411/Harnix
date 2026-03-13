// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { z } from "zod";

const uploadSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  preview: z.string().min(50, "Le résumé doit contenir au moins 50 caractères"),
  price: z.number().min(0, "Le prix doit être positif"),
  currency: z.string().default("XOF"),
  author: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  language: z.string().default("fr"),
  isDraft: z.boolean().default(false),
  fileUrl: z.string().min(1, "Chemin ou URL du fichier manquant"),
  coverImageUrl: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  try {
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est vendeur ou admin
    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Seuls les vendeurs peuvent publier des documents" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const metadata = uploadSchema.parse(body);

    // Créer le document en base de données avec les URLs directes
    // On met des valeurs par défaut pour les champs qui étaient auparavant calculés lors de l'upload
    const document = await prisma.document.create({
      data: {
        title: metadata.title,
        description: metadata.description,
        preview: metadata.preview,
        price: metadata.price,
        currency: metadata.currency,
        fileUrl: metadata.fileUrl,
        coverImageUrl: metadata.coverImageUrl || null,
        fileSize: 0, // Taille inconnue car externe
        fileType: "pdf", // Type par défaut ou à extraire de l'URL
        encryptionKey: "none", // Pas de chiffrement pour les liens externes
        checksum: "external", // Pas de checksum pour les liens externes
        author: metadata.author,
        category: metadata.category,
        tags: metadata.tags,
        language: metadata.language,
        sellerId: session.user.id,
        publishedAt: metadata.isDraft ? null : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        isDraft: metadata.isDraft,
      },
    });
  } catch (error: unknown) {
    const errorWithMeta = error as { message?: string; stack?: string; code?: string };
    console.error("Erreur publication document (URL):", {
      message: errorWithMeta.message,
      error
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: errorWithMeta.message || "Erreur lors de la publication du document",
      },
      { status: 500 }
    );
  }
}
