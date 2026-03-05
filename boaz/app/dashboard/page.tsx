import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import DashboardStats from "@/src/components/document/document-stats";
import BuyerDashboard from "@/src/components/document/buyer-dashboard";
import Link from "next/link";
import LogoutButton from "@/src/components/auth/logout-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const isSeller = session.user.role === "seller" || session.user.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
            <Link href="/" className="group">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                Tableau de bord
              </h1>
              <p className="text-gray-500 mt-2 font-medium">
                Ravi de vous revoir, <span className="text-blue-600">{session.user.name || session.user.email}</span>
              </p>
            </Link>

          </div>

          <div className="flex items-center space-x-4">
               {/*isSeller && (
                <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm"
                  >
                    Vue Vendeur
                  </Link>
                  <Link
                    href="/dashboard?view=buyer"
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg text-sm font-bold transition-colors"
                    title="Prochainement : vue acheteur pour vendeurs"
                  >
                    Vue Acheteur
                  </Link>
                </div>
              )*/}
            <LogoutButton />
          </div>
        </div>

        {isSeller ? (
          <DashboardStats />
        ) : (
          <BuyerDashboard />
        )}
      </div>
    </div>
  );
}