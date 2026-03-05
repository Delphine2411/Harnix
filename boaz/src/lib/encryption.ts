// lib/encryption.ts
import CryptoJS from "crypto-js";
import crypto from "crypto";

const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY!;
const ALGORITHM = "aes-256-cbc";

/**
 * Génère une clé de chiffrement unique pour un document
 */
export function generateDocumentKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Chiffre la clé de document avec la clé maître
 * (pour stockage sécurisé en base de données)
 */
export function encryptDocumentKey(documentKey: string): string {
  return CryptoJS.AES.encrypt(documentKey, MASTER_KEY).toString();
}

/**
 * Déchiffre la clé de document
 */
export function decryptDocumentKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, MASTER_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Chiffre un fichier (Buffer)
 */
export function encryptFile(fileBuffer: Buffer, documentKey: string): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(documentKey, "hex"), iv);

  const encrypted = Buffer.concat([
    cipher.update(fileBuffer),
    cipher.final(),
  ]);

  // Ajouter l'IV au début du fichier chiffré
  return Buffer.concat([iv, encrypted]);
}

/**
 * Déchiffre un fichier
 */
export function decryptFile(encryptedBuffer: Buffer, documentKey: string): Buffer {
  // Extraire l'IV (16 premiers bytes)
  const iv = encryptedBuffer.subarray(0, 16);
  const encrypted = encryptedBuffer.subarray(16);

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(documentKey, "hex"), iv);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
}

/**
 * Génère un hash du fichier pour vérification d'intégrité
 */
export function generateFileChecksum(fileBuffer: Buffer): string {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Vérifie l'intégrité d'un fichier
 */
export function verifyFileChecksum(fileBuffer: Buffer, expectedChecksum: string): boolean {
  const actualChecksum = generateFileChecksum(fileBuffer);
  return actualChecksum === expectedChecksum;
}

/**
 * Ajoute un watermark (filigrane) dans un document PDF
 * Injecte l'email de l'utilisateur dans les métadonnées du PDF
 */
export async function addWatermarkToPDF(
  pdfBuffer: Buffer,
  userEmail: string,
  purchaseToken: string
): Promise<Buffer> {
  const { PDFDocument } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Ajouter dans les métadonnées
  pdfDoc.setTitle(pdfDoc.getTitle() || "Document");
  pdfDoc.setAuthor(`Licensed to: ${userEmail}`);
  pdfDoc.setSubject(`Purchase Token: ${purchaseToken}`);
  pdfDoc.setKeywords([userEmail, purchaseToken]);

  // Optionnel: Ajouter du texte visible sur chaque page
  const pages = pdfDoc.getPages();
  const watermarkText = `Licensed to ${userEmail}`;

  for (const page of pages) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: 10,
      y: 10,
      size: 8,
      opacity: 0.3,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * Génère un token de téléchargement temporaire
 */
export function generateDownloadToken(purchaseToken: string): string {
  const timestamp = Date.now();
  const data = `${purchaseToken}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", MASTER_KEY)
    .update(data)
    .digest("hex");

  return Buffer.from(`${data}:${signature}`).toString("base64");
}

/**
 * Vérifie un token de téléchargement
 * @param token Token à vérifier
 * @param maxAge Durée de validité en millisecondes (défaut: 1 heure)
 */
export function verifyDownloadToken(
  token: string,
  maxAge: number = 3600000
): { valid: boolean; purchaseToken?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [purchaseToken, timestamp, signature] = decoded.split(":");

    // Vérifier la signature
    const data = `${purchaseToken}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac("sha256", MASTER_KEY)
      .update(data)
      .digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    // Vérifier l'expiration
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > maxAge) {
      return { valid: false };
    }

    return { valid: true, purchaseToken };
  } catch {
    return { valid: false };
  }
}

/**
 * Chiffrement côté client (pour React)
 * À utiliser dans les composants
 */
export const clientEncryption = {
  /**
   * Chiffre des données avec CryptoJS (côté client)
   */
  encrypt: (data: string, key: string): string => {
    return CryptoJS.AES.encrypt(data, key).toString();
  },

  /**
   * Déchiffre des données avec CryptoJS (côté client)
   */
  decrypt: (encryptedData: string, key: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  },
};

