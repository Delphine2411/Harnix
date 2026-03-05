"use client";

import dynamic from "next/dynamic";

const DocumentReader = dynamic(
    () => import("./document-reader"),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-600">Chargement du lecteur...</p>
            </div>
        )
    }
);

export default DocumentReader;
