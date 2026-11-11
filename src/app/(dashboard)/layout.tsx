import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

// 1. Daftar hak akses URL
const PAGE_ACCESS: Record<string, string[]> = {
  "/dashboard": ["admin", "cashier"],
  "/transaksi": ["admin", "cashier"],
  "/treatments": ["admin"],
  "/laporan": ["admin", "cashier"],
  "/info-kerja": ["admin", "cashier", "technician"],
  "/info-kerja/my-jobs": ["admin", "technician"],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload) {
    redirect("/login");
  }

  // Ambil data profile dari database menggunakan Drizzle
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, payload.id))
    .limit(1);

  if (!profile) {
    redirect("/login");
  }

  // =====================================================================
  // 2. LOGIKA PROTEKSI URL
  // Catatan: Di Layout (Server Component), kita tidak bisa membaca pathname
  // secara langsung. Namun, Anda bisa mengandalkan Middleware untuk ini.
  // Jika tetap ingin di layout, tambahkan middleware.ts (lihat penjelasan di bawah).
  // =====================================================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Sidebar profile={profile} />
      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <Header profile={profile} />
        {children}
      </main>
    </div>
  );
}
