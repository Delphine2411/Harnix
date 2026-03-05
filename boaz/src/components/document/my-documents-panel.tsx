"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FilePenLine, Trash2, Upload } from "lucide-react";

type Status = "draft" | "published";

interface SellerDocument {
  id: string;
  title: string;
  preview: string;
  price: number;
  currency: string;
  coverImageUrl: string | null;
  category: string | null;
  viewCount: number;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isDraft: boolean;
}

export default function MyDocumentsPanel({
  initialStatus,
}: {
  initialStatus: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<SellerDocument[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/dashboard/my-documents?status=${status}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Impossible de charger vos documents");
        }
        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "Erreur lors du chargement des documents"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
    return () => controller.abort();
  }, [status]);

  const handleToggleStatus = async (documentId: string, action: "publish" | "unpublish") => {
    try {
      setPendingId(documentId);
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Action impossible");
      }

      setDocuments((prev) =>
        prev.filter((doc) => doc.id !== documentId)
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    const confirmed = window.confirm("Supprimer ce document ? Cette action est irréversible.");
    if (!confirmed) return;

    try {
      setPendingId(documentId);
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Suppression impossible");
      }
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setPendingId(null);
    }
  };

  const formattedTitle = useMemo(
    () => (status === "draft" ? "Mes brouillons" : "Mes documents publiés"),
    [status]
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{formattedTitle}</h1>
            <p className="text-gray-600 mt-1">
              Gérez vos documents avant publication ou retirez-les du catalogue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setStatus("draft");
                  router.replace("/dashboard/my-documents?status=draft");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  status === "draft" ? "bg-yellow-500 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Brouillons
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("published");
                  router.replace("/dashboard/my-documents?status=published");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  status === "published" ? "bg-green-600 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Publiés
              </button>
            </div>

            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <Upload size={16} />
              Nouveau document
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            Chargement des documents...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-600">
              {status === "draft"
                ? "Aucun brouillon pour le moment."
                : "Aucun document publié pour le moment."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {documents.map((doc) => (
              <article key={doc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {doc.coverImageUrl && (
                  <img src={doc.coverImageUrl} alt={doc.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-gray-900 line-clamp-2">{doc.title}</h2>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        doc.isDraft
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {doc.isDraft ? "Brouillon" : "Publié"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3">{doc.preview}</p>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      Prix:{" "}
                      <span className="font-semibold text-gray-900">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: doc.currency,
                        }).format(doc.price)}
                      </span>
                    </p>
                    <p>
                      Stats: {doc.purchaseCount} ventes • {doc.viewCount} vues
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="inline-flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye size={15} />
                      Voir
                    </Link>
                    {doc.isDraft ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(doc.id, "publish")}
                        disabled={pendingId === doc.id}
                        className="inline-flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        <Upload size={15} />
                        Publier
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(doc.id, "unpublish")}
                        disabled={pendingId === doc.id}
                        className="inline-flex items-center justify-center gap-2 bg-yellow-500 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50"
                      >
                        <FilePenLine size={15} />
                        Retirer
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={pendingId === doc.id}
                    className="w-full inline-flex items-center justify-center gap-2 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
