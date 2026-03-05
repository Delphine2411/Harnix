

// app/dashboard/upload/page.tsx - Page d'upload
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import UploadForm from "@/src/components/upload/upload-forms";

export default async function UploadPage() {
  //const session = await getServerSession(authOptions);

 // if (!session?.user) {
 //   redirect("/auth/signin");
 // }

 // if (session.user.role !== "seller" && session.user.role !== "admin") {
 //   redirect("/dashboard");
 // }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <UploadForm />
      </div>
    </div>
  );
}

