"use client";

import { SessionProvider } from "next-auth/react";
import InstallButton from "@/src/components/install-button";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <InstallButton />
        </SessionProvider>
    );
}
