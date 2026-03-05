import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/src/components/providers";

export const metadata: Metadata = {
  title: "Boaz - Vente de documents sécurisée",
  description: "Monétisez votre expertise avec Boaz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
