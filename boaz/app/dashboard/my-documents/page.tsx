import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import MyDocumentsPanel from "@/src/components/document/my-documents-panel";

export default async function MyDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "seller" && session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const { status } = await searchParams;
  const normalizedStatus =
    status === "draft" || status === "published" ? status : "draft";

  return <MyDocumentsPanel initialStatus={normalizedStatus} />;
}
