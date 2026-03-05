// app/share/[token]/page.tsx - Page de partage
import { prisma } from "@/src/lib/db";
import PaymentForm from "@/src/components/payment/payment-form";
import { notFound } from "next/navigation";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shareAttempt = await prisma.shareAttempt.findUnique({
    where: { shareToken: token },
    include: {
      document: true,
      fromUser: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!shareAttempt || new Date() > shareAttempt.expiresAt) {
    notFound();
  }

  if (shareAttempt.status === "purchased") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Document déjà acheté
          </h2>
          <p className="text-gray-600">
            Ce document a déjà été acheté via ce lien de partage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {shareAttempt.fromUser.name} vous a partagé un document
            </h1>
            <p className="text-gray-600">
              Pour accéder à ce document, vous devez d&apos;abord l&apos;acheter
            </p>
          </div>

          {shareAttempt.message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">{shareAttempt.message}</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold mb-2">
              {shareAttempt.document.title}
            </h2>
            {shareAttempt.document.author && (
              <p className="text-gray-600 mb-4">
                par {shareAttempt.document.author}
              </p>
            )}
            <p className="text-gray-700 mb-4">
              {shareAttempt.document.preview}
            </p>
          </div>
        </div>

        <PaymentForm
          documentId={shareAttempt.documentId}
          price={Number(shareAttempt.document.price)}
          currency={shareAttempt.document.currency}
          shareToken={token}
        />
      </div>
    </div>
  );
}