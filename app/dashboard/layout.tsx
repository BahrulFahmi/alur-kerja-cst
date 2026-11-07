import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// Gunakan alias @/ untuk menunjuk ke folder root proyek
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Abaikan error
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar & Navigasi Bawah */}
      <Sidebar profile={profile} />

      {/* Area Konten Utama */}
      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        {/* Header Global (Nama & Logout di Kanan Atas khusus HP) */}
        <Header profile={profile} />

        {children}
      </main>
    </div>
  );
}
