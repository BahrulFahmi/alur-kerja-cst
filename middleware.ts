import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jika belum login dan mencoba akses dashboard, lempar ke login
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Proteksi Rute Berdasarkan Role
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    const path = request.nextUrl.pathname;

    // Aturan Teknisi (Hanya boleh akses Pantauan & Detail Order)
    if (role === "technician") {
      if (
        !path.startsWith("/dashboard/checking") &&
        !path.startsWith("/dashboard/orders")
      ) {
        return NextResponse.redirect(
          new URL("/dashboard/checking", request.url),
        );
      }
    }

    // Aturan Kasir (Tidak boleh akses Treatment & Settings)
    if (role === "cashier") {
      if (
        path.startsWith("/dashboard/treatments") ||
        path.startsWith("/dashboard/settings")
      ) {
        return NextResponse.redirect(
          new URL("/dashboard/orders/new", request.url),
        );
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
