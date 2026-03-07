import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

const DOCUMENT_TYPES = ["application/pdf", "application/epub+zip"];
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Configuration serveur incomplète: BLOB_READ_WRITE_TOKEN manquant" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  const isTokenRequest = body.type === "blob.generate-client-token";
  const session = isTokenRequest ? await getServerSession(authOptions) : null;

  if (isTokenRequest && !session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (
    isTokenRequest &&
    session?.user.role !== "seller" &&
    session?.user.role !== "admin"
  ) {
    return NextResponse.json(
      { error: "Seuls les vendeurs peuvent uploader des documents" },
      { status: 403 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const isCoverUpload = pathname.startsWith("documents/covers/");

        return {
          addRandomSuffix: true,
          allowedContentTypes: isCoverUpload ? COVER_TYPES : DOCUMENT_TYPES,
          tokenPayload: JSON.stringify({
            userId: session?.user?.id,
            role: session?.user?.role,
            kind: isCoverUpload ? "cover" : "document",
          }),
        };
      },
      onUploadCompleted: async () => {
        // La création du document est gérée ensuite par /api/documents/upload.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
