// src/lib/storage.ts - Gestion du stockage local en dev et Vercel Blob en prod
import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import crypto from "crypto";
import { del, put } from "@vercel/blob";

const API_PREFIX = "/api/documents/download/";
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), "storage/uploads");
const canUseLocalStorage =
  process.env.NODE_ENV !== "production" || Boolean(process.env.STORAGE_PATH);
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const hasBlobConfig = Boolean(blobToken);

// S'assurer que le dossier existe
if (!hasBlobConfig && canUseLocalStorage && !existsSync(STORAGE_PATH)) {
  mkdirSync(STORAGE_PATH, { recursive: true });
}

function getStorageIdentifier(fileIdentifier: string): string {
  if (fileIdentifier.startsWith("http://") || fileIdentifier.startsWith("https://")) {
    return fileIdentifier;
  }

  return decodeURIComponent(
    fileIdentifier.replace(API_PREFIX, "").split("/").pop() || fileIdentifier
  );
}

function buildStoredFileName(fileName: string) {
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

/**
 * Upload un fichier chiffré vers le stockage local
 */
export async function uploadEncryptedFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const fileId = buildStoredFileName(fileName);

  if (hasBlobConfig) {
    const blob = await put(`documents/${fileId}`, fileBuffer, {
      access: "public",
      token: blobToken,
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });

    return blob.url;
  } else if (canUseLocalStorage) {
    const filePath = path.join(STORAGE_PATH, fileId);
    await fs.writeFile(filePath, fileBuffer);
  } else {
    throw new Error(
      "Storage is not configured for production. Set BLOB_READ_WRITE_TOKEN or define STORAGE_PATH on a writable persistent volume."
    );
  }

  // On retourne l'URL de l'API qui permet de télécharger le fichier
  // pour que le frontend puisse l'utiliser directement (notamment pour les images de couverture)
  return `${API_PREFIX}${encodeURIComponent(fileId)}`;
}

/**
 * Télécharge un fichier depuis le stockage local
 */
export async function downloadFile(fileIdentifier: string): Promise<Buffer> {
  const fileId = getStorageIdentifier(fileIdentifier);

  if (fileId.startsWith("http://") || fileId.startsWith("https://")) {
    const response = await fetch(fileId, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Fichier introuvable");
    }

    return Buffer.from(await response.arrayBuffer());
  }

  if (!canUseLocalStorage) {
    throw new Error("Storage is not configured for production.");
  }

  const filePath = path.join(STORAGE_PATH, fileId);

  if (!existsSync(filePath)) {
    console.error(`Fichier introuvable au chemin : ${filePath}`);
    throw new Error("Fichier introuvable");
  }

  return await fs.readFile(filePath);
}

/**
 * Génère une URL signée temporaire pour téléchargement (Simulé pour local)
 */
export async function generatePresignedUrl(
  fileIdentifier: string
): Promise<string> {
  const fileId = getStorageIdentifier(fileIdentifier);
  return `${API_PREFIX}${encodeURIComponent(fileId)}`;
}

/**
 * Supprime un fichier du stockage local
 */
export async function deleteFile(fileIdentifier: string): Promise<void> {
  const fileId = getStorageIdentifier(fileIdentifier);

  if (fileId.startsWith("http://") || fileId.startsWith("https://")) {
    await del(fileId, {
      token: blobToken,
    });
    return;
  }

  if (!canUseLocalStorage) {
    throw new Error("Storage is not configured for production.");
  }

  const filePath = path.join(STORAGE_PATH, fileId);

  if (existsSync(filePath)) {
    await fs.unlink(filePath);
  }
}
