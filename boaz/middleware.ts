// middleware.ts (à la racine du projet)
import { withAuth } from "next-auth/middleware";
import { NextFetchEvent } from "next/server";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Routes réservées aux vendeurs
    if (path.startsWith("/dashboard/upload") && token?.role !== "seller" && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Routes réservées aux admins
    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXTAUTH_SECRET) {
    return NextResponse.next();
  }

  return authMiddleware(req as never, event);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reader/:path*",
    "/admin/:path*",
  ],
};
