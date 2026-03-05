import { NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/src/lib/storage";
import path from "path";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const { key } = await params;

        // Pour les images de couverture (qui commencent généralement par 'documents/')
        // Note: Dans ma nouvelle implémentation storage.ts, j'ai simplifié la clé.

        // On pourrait ajouter des vérifications de session ici si nécessaire
        // Mais pour l'instant on va servir le fichier car il est chiffré de toute façon
        // (sauf l'image de couverture)

        const fileBuffer = await downloadFile(key);

        // Essayer de deviner le Content-Type à partir de l'extension
        const ext = path.extname(key).toLowerCase();
        let contentType = "application/octet-stream";

        if (ext === ".pdf") contentType = "application/pdf";
        else if (ext === ".epub") contentType = "application/epub+zip";
        else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
        else if (ext === ".png") contentType = "image/png";
        else if (ext === ".webp") contentType = "image/webp";

        return new NextResponse(fileBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Erreur téléchargement local:", error);
        return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }
}
