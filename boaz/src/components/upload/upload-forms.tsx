// components/UploadForm.tsx
"use client";

import { upload } from "@vercel/blob/client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookText, Coins, FileText, ImageIcon, Tags, Upload } from "lucide-react";

interface UploadFormData {
  title: string;
  description: string;
  preview: string;
  price: number;
  currency: string;
  author: string;
  category: string;
  tags: string;
  language: string;
}

export default function UploadForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<UploadFormData>({
    title: "",
    description: "",
    preview: "",
    price: 0,
    currency: "XOF",
    author: "",
    category: "",
    tags: "",
    language: "fr",
  });

  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [submitAction, setSubmitAction] = useState<"draft" | "publish">("publish");
  const [descriptionCount, setDescriptionCount] = useState(0);
  const [previewCount, setPreviewCount] = useState(0);

  const uploadToBlob = async (selectedFile: File, folder: "tmp" | "covers") => {
    return upload(`documents/${folder}/${selectedFile.name}`, selectedFile, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
      contentType: selectedFile.type,
      multipart: true,
      onUploadProgress: ({ percentage }) => {
        setProgress(Math.max(5, Math.min(95, percentage)));
      },
    });
  };

  const categories = [
    "Éducation",
    "Business",
    "Technologie",
    "Santé",
    "Art & Design",
    "Sciences",
    "Littérature",
    "Juridique",
    "Autre",
  ];

  const currencies = [
    { code: "XOF", name: "Franc CFA (XOF)" },
    { code: "USD", name: "Dollar US (USD)" },
    { code: "EUR", name: "Euro (EUR)" },
  ];

  const tagsList = useMemo(
    () => formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    [formData.tags]
  );

  const isReadyToPublish =
    formData.title.trim().length >= 3 &&
    formData.description.trim().length >= 10 &&
    formData.preview.trim().length >= 50 &&
    formData.price > 0 &&
    !!file;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Vérifier le type de fichier
      const allowedTypes = ["application/pdf", "application/epub+zip"];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Format de fichier non supporté. Utilisez PDF ou EPUB.");
        return;
      }

      // Vérifier la taille (50 MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("Le fichier est trop volumineux (max 50 MB)");
        return;
      }

      setFile(selectedFile);
      setError("");
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = (submitter?.value as "draft" | "publish" | undefined) ?? "publish";
    setSubmitAction(action);

    if (!file) {
      setError("Veuillez sélectionner un fichier");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(0);

    try {
      const metadata = {
        ...formData,
        tags: tagsList,
        isDraft: action === "draft",
      };

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      let response: Response;
      const isDev = process.env.NODE_ENV === "development" || window.location.hostname === "localhost";

      try {
        // En prod on utilise le client-side upload pour économiser la bande passante du serveur
        // Mais en local, cela cause des erreurs CORS avec Vercel Blob, donc on utilise le fallback direct
        if (isDev) {
          throw new Error("Local environment: skipping client-side blob upload");
        }

        const uploadedDocument = await uploadToBlob(file, "tmp");
        const uploadedCover = coverImage ? await uploadToBlob(coverImage, "covers") : null;

        response = await fetch("/api/documents/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...metadata,
            fileUrl: uploadedDocument.url,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            coverImageUrl: uploadedCover?.url,
          }),
        });
      } catch (uploadError) {
        console.log("Using direct fallback upload...", uploadError);
        const formDataToSend = new FormData();
        formDataToSend.append("file", file);
        formDataToSend.append("metadata", JSON.stringify(metadata));

        if (coverImage) {
          formDataToSend.append("coverImage", coverImage);
        }

        response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formDataToSend,
        });
      }

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Erreur lors de l'upload");
      }

      const data = await response.json();

      // Brouillon: retour dashboard. Publication: page publique du document.
      setTimeout(() => {
        if (action === "draft") {
          router.push("/dashboard/my-documents?status=draft");
          return;
        }
        router.push(`/documents/${data.document.id}`);
      }, 1000);
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Créer un document
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Ajoutez votre fichier, complétez les métadonnées et publiez en quelques minutes.
          </p>
        </div>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Fichiers
          </h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Document (PDF ou EPUB) *</label>
            <input
              type="file"
              accept=".pdf,.epub"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border file:border-blue-200 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
            <p className="text-xs text-gray-500">Formats autorisés: PDF, EPUB. Taille max: 50 MB.</p>
            {file && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-500" />
              Image de couverture (optionnel)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border file:border-gray-200 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BookText className="w-5 h-5 text-blue-600" />
            Informations du document
          </h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Titre *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={3}
              placeholder="Ex: Guide complet de rédaction juridique"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Auteur</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom de l'auteur ou de l'organisation"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description complète *</label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setDescriptionCount(e.target.value.length);
              }}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={10}
              placeholder="Décrivez clairement le contenu, la valeur et le public cible."
            />
            <p className="text-xs text-gray-500 text-right">{descriptionCount} caractères</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Aperçu gratuit *</label>
            <textarea
              value={formData.preview}
              onChange={(e) => {
                setFormData({ ...formData, preview: e.target.value });
                setPreviewCount(e.target.value.length);
              }}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={50}
              placeholder="Résumé visible avant l'achat. Minimum 50 caractères."
            />
            <p className="text-xs text-gray-500 text-right">{previewCount}/50 minimum</p>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-600" />
            Vente et classement
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Prix *</label>
              <input
                type="number"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value) })
                }
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Devise *</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Langue</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
                <option value="es">Espagnol</option>
                <option value="pt">Portugais</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tags (séparés par des virgules)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="exemple: éducation, science, recherche"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </section>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">Upload en cours... {progress}%</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 h-fit">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Résumé de publication
          </h3>

          <div className="space-y-3 text-sm">
            <p className="text-gray-600">Titre: <span className="text-gray-900 font-medium">{formData.title || "Non défini"}</span></p>
            <p className="text-gray-600">
              Prix:{" "}
              <span className="text-gray-900 font-semibold">
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: formData.currency }).format(
                  formData.price || 0
                )}
              </span>
            </p>
            <p className="text-gray-600">Catégorie: <span className="text-gray-900 font-medium">{formData.category || "Aucune"}</span></p>
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
              <Tags className="w-4 h-4" />
              Tags détectés
            </p>
            {tagsList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tagsList.slice(0, 6).map((tag) => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Aucun tag pour le moment.</p>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              value="draft"
              disabled={loading || !file}
              className="w-full bg-white text-gray-900 py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {loading && submitAction === "draft" ? "Enregistrement..." : "Enregistrer en brouillon"}
            </button>
            <button
              type="submit"
              value="publish"
              disabled={loading || !isReadyToPublish}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {loading && submitAction === "publish" ? "Publication..." : "Publier le document"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Brouillon: visible uniquement dans votre espace vendeur. Publication: visible aux acheteurs.
          </p>
        </div>
      </aside>
    </form>
  );
}
