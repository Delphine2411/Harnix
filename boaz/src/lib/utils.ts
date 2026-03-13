/**
 * Résout une URL pour l'affichage dans le frontend.
 * Gère les URLs externes, les fichiers dans public/ et les fichiers ailleurs dans le projet.
 */
export function resolveStaticAssetUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    // Normaliser l'URL en enlevant le slash initial si présent pour les tests de préfixe
    const normalizedUrl = url.startsWith("/") ? url.substring(1) : url;

    // Si c'est un chemin dans public/, on peut le servir directement seulement pour les images
    // pour que next/image en profite. Pour les PDF, on passe par l'API pour plus de robustesse.
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(normalizedUrl);
    if (normalizedUrl.startsWith("public/") && isImage) {
        return `/${normalizedUrl.replace("public/", "")}`;
    }

    // Si c'est déjà un chemin d'API ou une URL externe, on ne touche à rien
    if (url.startsWith("/") && !url.startsWith("/public/")) return url;
    if (url.startsWith("api/")) return `/${url}`;

    // Sinon on passe par l'API de téléchargement (pour les fichiers ailleurs dans le projet)
    // On repasse le chemin "net" (sans le public/ si on veut, mais storage.ts gère les deux)
    return `/api/documents/download/${encodeURIComponent(normalizedUrl)}`;
}
