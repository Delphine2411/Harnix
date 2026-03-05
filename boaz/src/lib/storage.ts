// src/lib/storage.ts - Gestion du stockage Local (remplace S3)
import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";

// Chemin de stockage local (à la racine du projet)
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), "storage/uploads");
const API_PREFIX = "/api/documents/download/";

// S'assurer que le dossier existe
if (!existsSync(STORAGE_PATH)) {
  mkdirSync(STORAGE_PATH, { recursive: true });
}

/**
 * Upload un fichier chiffré vers le stockage local
 */
export async function uploadEncryptedFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const fileId = `${Date.now()}-${fileName}`;
  const filePath = path.join(STORAGE_PATH, fileId);

  await fs.writeFile(filePath, fileBuffer);

  // On retourne l'URL de l'API qui permet de télécharger le fichier
  // pour que le frontend puisse l'utiliser directement (notamment pour les images de couverture)
  return `${API_PREFIX}${fileId}`;
}

/**
 * Télécharge un fichier depuis le stockage local
 */
export async function downloadFile(fileIdentifier: string): Promise<Buffer> {
  // Extraire l'ID du fichier s'il s'agit d'une URL d'API
  const fileId = fileIdentifier.replace(API_PREFIX, "").split("/").pop() || fileIdentifier;
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
  fileIdentifier: string,
  expiresIn: number = 3600
): Promise<string> {
  // Si c'est déjà une URL d'API, on la retourne telle quelle
  if (fileIdentifier.startsWith(API_PREFIX)) {
    return fileIdentifier;
  }
  return `${API_PREFIX}${fileIdentifier}`;
}

/**
 * Supprime un fichier du stockage local
 */
export async function deleteFile(fileIdentifier: string): Promise<void> {
  const fileId = fileIdentifier.replace(API_PREFIX, "").split("/").pop() || fileIdentifier;
  const filePath = path.join(STORAGE_PATH, fileId);

  if (existsSync(filePath)) {
    await fs.unlink(filePath);
  }
}