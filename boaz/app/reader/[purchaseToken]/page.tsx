import DocumentReader from "@/src/components/document/reader-client";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ purchaseToken: string }>;
}) {
  const { purchaseToken } = await params;
  return <DocumentReader purchaseToken={purchaseToken} />;
}

