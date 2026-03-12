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
import { deleteFile, downloadFile } from "@/src/lib/storage";

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

const blobUploadSchema = uploadSchema.extend({
  fileUrl: z.string().url("URL de fichier invalide"),
  fileName: z.string().min(1, "Nom de fichier manquant"),
  fileSize: z.number().min(1).max(MAX_FILE_SIZE),
  fileType: z.string().min(1, "Type de fichier manquant"),
  coverImageUrl: z.string().url("URL d'image invalide").optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  try {
    if (!process.env.ENCRYPTION_MASTER_KEY) {
      return NextResponse.json(
        { error: "Configuration serveur incomplète: ENCRYPTION_MASTER_KEY manquant" },
        { status: 500 }
      );
    }

    if (
      process.env.NODE_ENV === "production" &&
      !process.env.BLOB_READ_WRITE_TOKEN &&
      !process.env.STORAGE_PATH
    ) {
      return NextResponse.json(
        { error: "Configuration serveur incomplète: BLOB_READ_WRITE_TOKEN manquant" },
        { status: 500 }
      );
    }

    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey || masterKey === "générer-une-clé-ici" || masterKey.length < 32) {
      return NextResponse.json(
        {
          error: "Configuration serveur incomplète",
          message: "ENCRYPTION_MASTER_KEY est manquante ou invalide. Elle doit être une chaîne hexadécimale de 32 octets."
        },
        { status: 500 }
      );
    }

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

    const contentType = req.headers.get("content-type") || "";
    let metadata;
    let fileBuffer: Buffer;
    let originalFileName: string;
    let originalFileSize: number;
    let originalFileType: string;
    let coverImageUrl: string | undefined;
    let temporaryDocumentUrl: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const payload = blobUploadSchema.parse(body);

      metadata = payload;
      originalFileName = payload.fileName;
      originalFileSize = payload.fileSize;
      originalFileType = payload.fileType;
      temporaryDocumentUrl = payload.fileUrl;
      coverImageUrl = payload.coverImageUrl;
      fileBuffer = await downloadFile(payload.fileUrl);
    } else {
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

      metadata = uploadSchema.parse(JSON.parse(metadataStr));
      originalFileName = file.name;
      originalFileSize = file.size;
      originalFileType = file.type;
      fileBuffer = Buffer.from(await file.arrayBuffer());

      const coverImage = formData.get("coverImage") as File;
      if (coverImage) {
        const coverBuffer = Buffer.from(await coverImage.arrayBuffer());
        coverImageUrl = await uploadEncryptedFile(
          coverBuffer,
          coverImage.name
        );
      }
    }

    // Générer une clé de chiffrement unique pour ce document
    const documentKey = generateDocumentKey();

    // Chiffrer le fichier
    const encryptedBuffer = encryptFile(fileBuffer, documentKey);

    // Générer le checksum du fichier original
    const checksum = generateFileChecksum(fileBuffer);

    // Upload vers S3
    const fileUrl = await uploadEncryptedFile(
      encryptedBuffer,
      originalFileName
    );

    // Chiffrer la clé du document avec la clé maître
    const encryptedKey = encryptDocumentKey(documentKey);

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
        fileSize: originalFileSize,
        fileType: originalFileType.split("/")[1] || "pdf",
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

    if (temporaryDocumentUrl) {
      try {
        await deleteFile(temporaryDocumentUrl);
      } catch (cleanupError) {
        console.warn("Échec du nettoyage du fichier temporaire:", cleanupError);
      }
    }

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
        error: errorWithMeta.message || "Erreur lors de l'upload du document",
      },
      { status: 500 }
    );
  }
}
