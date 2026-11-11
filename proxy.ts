import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Jika belum login dan mencoba akses dashboard, lempar ke login
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/info-kerja") ||
    path.startsWith("/transaksi") ||
    path.startsWith("/laporan") ||
    path.startsWith("/treatments")
  ) {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = payload.role;

    // Aturan Teknisi
    if (role === "technician") {
      if (!path.startsWith("/info-kerja")) {
        return NextResponse.redirect(new URL("/info-kerja", request.url));
      }
    }

    // Aturan Kasir
    if (role === "cashier") {
      if (path.startsWith("/treatments")) {
        return NextResponse.redirect(new URL("/transaksi/new", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
