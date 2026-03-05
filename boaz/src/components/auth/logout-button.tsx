"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-100"
            title="Se déconnecter"
        >
            <LogOut size={18} />
            <span className="hidden sm:inline">Déconnexion</span>
        </button>
    );
}
