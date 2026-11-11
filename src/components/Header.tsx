"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function Header({ profile }: { profile: any }) {
  const router = useRouter();

  const handleLogout = async () => {
    const isConfirmed = window.confirm(
      "Apakah Anda yakin ingin keluar dari aplikasi?",
    );
    if (isConfirmed) {
      // Hapus cookie session (JWT)
      document.cookie =
        "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="flex justify-between items-center mb-4 md:hidden w-full">
      {/* KIRI: Nama User */}
      <div className="flex flex-col">
        <p className="text-[9px] text-slate-400 leading-none mb-0.5">
          Login sebagai
        </p>
        <p className="text-sm font-bold text-accent leading-tight capitalize max-w-[150px] truncate">
          {profile?.fullName || "Guest"}
        </p>
      </div>

      {/* KANAN: Tombol Logout */}
      <button
        onClick={handleLogout}
        className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/20 transition-colors shadow-sm"
        title="Keluar"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}
