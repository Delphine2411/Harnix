// components/DocumentReader.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Share2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Turbopack (Next 16) ne résout pas toujours ce module via import.meta.url.
// On utilise une URL HTTPS explicite pour éviter l'erreur de build et les soucis
// potentiels des URL protocol-relative (`//...`) sur mobile.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentReaderProps {
  purchaseToken: string;
}

interface DocumentInfo {
  title?: string;
  author?: string;
  [key: string]: unknown;
}

export default function DocumentReader({ purchaseToken }: DocumentReaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [viewportWidth, setViewportWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const file = useMemo(() => {
    if (!pdfData) return null;
    return { data: pdfData };
  }, [pdfData]);

  useEffect(() => {
    loadDocument();
  }, [purchaseToken]);

  useEffect(() => {
    const updateWidth = () => {
      const element = containerRef.current;
      if (element) {
        setContainerWidth(element.clientWidth);
      }
      setViewportWidth(window.innerWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const pageWidth = useMemo(() => {
    const horizontalPadding = containerWidth > 640 ? 32 : 16;
    const containerTarget = containerWidth - horizontalPadding;
    const viewportTarget = viewportWidth - 24;
    // Force un vrai "fit to screen" sur mobile.
    return Math.max(Math.min(containerTarget, viewportTarget), 1);
  }, [containerWidth, viewportWidth]);

  const effectiveScale = useMemo(() => {
    const isMobile = viewportWidth < 768;
    return isMobile ? Math.min(scale, 1) : scale;
  }, [scale, viewportWidth]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Tenter de charger depuis le cache local d'abord (pour rapidité et offline)
      const cached = await getFromCache(purchaseToken);
      if (cached) {
        console.log("Chargement depuis le cache local...");
        setDocumentInfo(cached.document);
        const decryptedBuffer = await decryptFileClient(cached.encryptedData, cached.decryptionKey);
        setPdfData(new Uint8Array(decryptedBuffer));
        setLoading(false);
        // On continue quand même pour vérifier si une mise à jour est nécessaire ou valider le token si online
      }

      // Générer un ID d'appareil unique
      let deviceId = localStorage.getItem("device_id");
      if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem("device_id", deviceId);
      }

      console.log("Validation du token...");
      const validationResponse = await fetch("/api/validate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
        },
        body: JSON.stringify({ purchaseToken }),
      }).catch(() => null); // Gérer le mode offline sans crash

      if (!validationResponse) {
        if (cached) return; // Déjà chargé depuis le cache
        throw new Error("Vous semblez être hors ligne et ce document n'est pas encore disponible localement.");
      }

      if (!validationResponse.ok) {
        const err = await validationResponse.json();
        throw new Error(err.error || "Token invalide ou expiré");
      }

      const { decryptionKey, documentUrl, document } = await validationResponse.json();

      // Si on a déjà les données du cache et qu'on est online, on s'arrête là si pas de changement
      // (On pourrait ajouter un check de version/updatedAt ici)
      if (cached && cached.decryptionKey === decryptionKey) {
        console.log("Le cache est à jour.");
        return;
      }

      console.log("Token validé, téléchargement du document...");
      setDocumentInfo(document);

      // Télécharger le fichier chiffré
      const fileResponse = await fetch(documentUrl);
      if (!fileResponse.ok) {
        throw new Error("Erreur lors du téléchargement du document");
      }

      const encryptedData = await fileResponse.arrayBuffer();
      console.log("Données chiffrées reçues:", encryptedData.byteLength, "octets");

      // Mettre en cache pour une utilisation ultérieure hors ligne
      await saveToCache(purchaseToken, { encryptedData, decryptionKey, document });

      // Déchiffrer le fichier côté client
      const decryptedBuffer = await decryptFileClient(encryptedData, decryptionKey);
      const decryptedData = new Uint8Array(decryptedBuffer);

      // LOGS DE DEBUG
      const header = String.fromCharCode(...decryptedData.slice(0, 5));
      console.log("Entête du fichier déchiffré:", header);

      if (header !== "%PDF-") {
        console.warn("ALERTE: Le fichier déchiffré ne semble pas être un PDF valide (doit commencer par %PDF-)");
      }

      setPdfData(decryptedData);
    } catch (err: unknown) {
      console.error("Erreur chargement document:", err);
      // Si on a échoué online mais qu'on a du cache, on ne montre pas l'erreur
      const cached = await getFromCache(purchaseToken);
      if (!cached) {
        const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement du document";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Déchiffrement côté client
  const decryptFileClient = async (
    encryptedBuffer: ArrayBuffer,
    keyHex: string
  ): Promise<ArrayBuffer> => {
    // Convertir la clé hex en Uint8Array
    const keyData = new Uint8Array(
      keyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const data = new Uint8Array(encryptedBuffer);
    const iv = data.slice(0, 16); // Les 16 premiers bytes sont l'IV
    const encrypted = data.slice(16);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      encrypted
    );

    return decrypted;
  };

  const generateDeviceId = (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
  };

  // IndexedDB Utilities
  const DB_NAME = "BoazSecureStore";
  const STORE_NAME = "documents";

  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "token" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const saveToCache = async (token: string, data: { encryptedData: ArrayBuffer, decryptionKey: string, document: DocumentInfo }) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put({ token, ...data });
    } catch (err) {
      console.error("Erreur mise en cache IndexedDB:", err);
    }
  };

  const getFromCache = async (token: string): Promise<{ token: string; encryptedData: ArrayBuffer; decryptionKey: string; document: DocumentInfo } | null> => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(token);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Erreur lecture cache IndexedDB:", err);
      return null;
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPreviousPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleShare = async () => {
    const shareData = {
      title: documentInfo?.title || "Document Boaz",
      text: `Découvrez ce document sur Boaz : ${documentInfo?.title || ""}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Lien copié dans le presse-papier !");
      }
    } catch (err) {
      console.error("Erreur lors du partage :", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Erreur</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadDocument}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-100 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
          e.preventDefault();
          alert("L'impression et la sauvegarde sont désactivées pour ce document.");
        }
      }}
    >
      <style jsx global>{`
        @media print {
          body {
            display: none !important;
          }
        }
      `}</style>
      {/* Barre d'outils */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-semibold text-gray-800 line-clamp-1">
                {documentInfo?.title || "Document"}
              </h1>
              {documentInfo?.author && (
                <span className="text-xs sm:text-sm text-gray-600 line-clamp-1">par {documentInfo.author}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-md p-1">
                <button
                  onClick={goToPreviousPage}
                  disabled={pageNumber <= 1}
                  className="p-2 hover:bg-white rounded-md disabled:opacity-50 transition-colors"
                >
                  ←
                </button>
                <span className="text-xs sm:text-sm text-gray-700 px-2 min-w-[60px] text-center">
                  {pageNumber} / {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="p-2 hover:bg-white rounded-md disabled:opacity-50 transition-colors"
                >
                  →
                </button>
              </div>

              <div className="flex items-center bg-gray-100 rounded-md p-1">
                <button
                  onClick={zoomOut}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                >
                  -
                </button>
                <span className="text-xs sm:text-sm text-gray-700 px-2 min-w-[50px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleShare}
                className="flex items-center justify-center p-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title="Partager ce document"
              >
                <Share2 size={18} />
                <span className="hidden sm:inline ml-2 text-sm font-medium">Partager</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Viewer PDF */}
      <div id="pdf-container" ref={containerRef} className="max-w-5xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden flex justify-center">
          {pdfData && (
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              className="max-w-full"
              loading={
                <div className="p-8 text-center text-gray-500">
                  Traitement des pages...
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={effectiveScale}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>
      </div>

      {/* Watermark discret */}
      <div className="fixed bottom-4 right-4 bg-white bg-opacity-80 px-3 py-1 rounded-md text-xs text-gray-500">
        Document sous licence
      </div>

    </div>
  );
}
