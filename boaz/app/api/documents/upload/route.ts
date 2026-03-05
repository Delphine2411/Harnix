// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import {
  generateDocumentKey,
  encryptDocumentKey,
  encryptFile,
  generateFileChecksum,
} from "@/src/lib/encryption";
import { uploadEncryptedFile } from "@/src/lib/storage";
import { z } from "zod";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est vendeur ou admin
    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Seuls les vendeurs peuvent uploader des documents" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const metadataStr = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier est trop volumineux (max 50 MB)" },
        { status: 400 }
      );
    }

    // Valider les métadonnées
    const metadata = uploadSchema.parse(JSON.parse(metadataStr));

    // Lire le fichier
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Générer une clé de chiffrement unique pour ce document
    const documentKey = generateDocumentKey();

    // Chiffrer le fichier
    const encryptedBuffer = encryptFile(fileBuffer, documentKey);

    // Générer le checksum du fichier original
    const checksum = generateFileChecksum(fileBuffer);

    // Upload vers S3
    const fileUrl = await uploadEncryptedFile(
      encryptedBuffer,
      file.name,
      file.type
    );

    // Chiffrer la clé du document avec la clé maître
    const encryptedKey = encryptDocumentKey(documentKey);

    // Upload de l'image de couverture si présente
    let coverImageUrl;
    const coverImage = formData.get("coverImage") as File;
    if (coverImage) {
      const coverBuffer = Buffer.from(await coverImage.arrayBuffer());
      coverImageUrl = await uploadEncryptedFile(
        coverBuffer,
        coverImage.name,
        coverImage.type
      );
    }

    // Créer le document en base de données
    const document = await prisma.document.create({
      data: {
        title: metadata.title,
        description: metadata.description,
        preview: metadata.preview,
        price: metadata.price,
        currency: metadata.currency,
        fileUrl,
        coverImageUrl,
        fileSize: file.size,
        fileType: file.type.split("/")[1] || "pdf",
        encryptionKey: encryptedKey,
        checksum,
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
    console.error("Erreur détaillée upload document:", {
      message: errorWithMeta.message,
      stack: errorWithMeta.stack,
      error
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    // Erreur de permission ou disque plein
    if (errorWithMeta.code === "EACCES" || errorWithMeta.code === "ENOSPC") {
      return NextResponse.json(
        { error: "Erreur de stockage local (Vérifiez les permissions ou l'espace disque)" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'upload du document",
        message: process.env.NODE_ENV === "development" ? errorWithMeta.message : undefined
      },
      { status: 500 }
    );
  }
}
