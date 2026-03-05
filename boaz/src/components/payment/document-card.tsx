// components/DocumentCard.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import ShareDialog from "./share-dialogue";

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    description: string;
    preview: string;
    price: number;
    currency: string;
    coverImageUrl?: string;
    author?: string;
    category?: string;
    viewCount: number;
    purchaseCount: number;
  };
  hasPurchased?: boolean;
  purchaseToken?: string;
}

export default function DocumentCard({
  document,
  hasPurchased,
  purchaseToken,
}: DocumentCardProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        {/* Image de couverture */}
        {document.coverImageUrl && (
          <div className="h-100 bg-gray-200 overflow-hidden">
            <img
              src={document.coverImageUrl}
              alt={document.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Contenu */}
        <div className="p-5">
          <div className="mb-2">
            {document.category && (
              <span className="text-xs font-semibold text-blue-600 uppercase">
                {document.category}
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {document.title}
          </h3>

          {document.author && (
            <p className="text-sm text-gray-600 mb-2">par {document.author}</p>
          )}

          <p className="text-sm text-gray-700 mb-4 line-clamp-3">
            {document.preview}
          </p>

          {/* Prix et stats */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: document.currency,
              }).format(document.price)}
            </span>
            <div className="text-xs text-gray-500">
              {document.purchaseCount} achats
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            {hasPurchased ? (
              <>
                <Link
                  href={`/reader/${purchaseToken}`}
                  className="flex-1 bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700"
                >
                  Lire
                </Link>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Partager
                </button>
              </>
            ) : (
              <Link
                href={`/documents/${document.id}`}
                className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Acheter
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de partage */}
      {showShareDialog && (
        <ShareDialog
          documentId={document.id}
          documentTitle={document.title}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </>
  );
}