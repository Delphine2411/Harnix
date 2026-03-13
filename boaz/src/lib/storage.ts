// src/lib/storage.ts - Gestion du stockage local
import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import crypto from "crypto";

const API_PREFIX = "/api/documents/download/";
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), "storage/uploads");
const canUseLocalStorage = true; // Toujours utiliser le stockage local désormais

// S'assurer que le dossier existe
if (canUseLocalStorage && !existsSync(STORAGE_PATH)) {
  try {
    mkdirSync(STORAGE_PATH, { recursive: true });
  } catch (err) {
    console.warn("Failed to create storage directory:", err);
  }
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
  const filePath = path.join(STORAGE_PATH, fileId);

  await fs.writeFile(filePath, fileBuffer);

  // On retourne l'URL de l'API qui permet de télécharger le fichier
  return `${API_PREFIX}${encodeURIComponent(fileId)}`;
}

/**
 * Télécharge un fichier depuis le stockage local (uploads), une URL externe ou le dossier du projet
 */
export async function downloadFile(fileIdentifier: string): Promise<Buffer> {
  // 1. URLs Externes
  if (fileIdentifier.startsWith("http://") || fileIdentifier.startsWith("https://")) {
    const response = await fetch(fileIdentifier);
    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement externe : ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // 2. Fichiers statiques du projet (ex: content/mon-doc.pdf)
  // On décode l'identifiant pour gérer les caractères spéciaux
  const decodedId = decodeURIComponent(fileIdentifier);
  const projectRootPath = path.join(process.cwd(), decodedId);

  try {
    const stats = await fs.stat(projectRootPath);
    if (stats.isFile()) {
      return await fs.readFile(projectRootPath);
    }
  } catch {
    // Si échec, on essaie de lister le répertoire pour voir s'il y a des espaces en trop à la fin
    try {
      const dir = path.dirname(projectRootPath);
      const base = path.basename(projectRootPath);
      const files = await fs.readdir(dir);
      const match = files.find(f => f.trim() === base.trim());
      if (match) {
        const matchPath = path.join(dir, match);
        return await fs.readFile(matchPath);
      }
    } catch {
      // Ignorer l'erreur de recherche approfondie
    }
  }

  // 3. Stockage des uploads (système par défaut)
  const fileId = getStorageIdentifier(decodedId);
  const filePath = path.join(STORAGE_PATH, fileId);

  if (!existsSync(filePath)) {
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
  if (fileId.startsWith("http://") || fileId.startsWith("https://")) {
    return fileId;
  }
  return `${API_PREFIX}${encodeURIComponent(fileId)}`;
}

/**
 * Supprime un fichier du stockage local
 */
export async function deleteFile(fileIdentifier: string): Promise<void> {
  const fileId = getStorageIdentifier(fileIdentifier);
  const filePath = path.join(STORAGE_PATH, fileId);

  if (existsSync(filePath)) {
    await fs.unlink(filePath);
  }
}
