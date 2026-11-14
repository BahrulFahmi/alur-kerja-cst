"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react"; // Import semua icon Lucide
import { LogOut } from "lucide-react";
import { MODULE_NAV_ITEMS } from "@/lib/modules-nav";

export default function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const userRole = profile?.role || "";

  // 1. Filter menu berdasarkan role user yang sedang login
  const allowedMenus = MODULE_NAV_ITEMS.filter((menu) => {
    if (menu.access.type === "public") return true;
    if (menu.access.type === "owner_admin_only")
      return ["owner", "admin"].includes(userRole);
    if (menu.access.type === "menu")
      return menu.access.roles.includes(userRole);
    return false;
  });

  // 2. Kelompokkan menu berdasarkan group (Operasional, Produksi, Master Data, Laporan)
  const groupedMenus = allowedMenus.reduce(
    (acc, menu) => {
      if (!acc[menu.group]) acc[menu.group] = [];
      acc[menu.group].push(menu);
      return acc;
    },
    {} as Record<string, typeof allowedMenus>,
  );

  const logout = async () => {
    const isConfirmed = window.confirm(
      "Apakah Anda yakin ingin keluar dari aplikasi?",
    );
    if (isConfirmed) {
      document.cookie =
        "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 p-4 gap-2 bg-slate-900/95 border-r border-slate-800 z-30">
        <div className="neu-card mb-4 border border-slate-700/50">
          <p className="text-xs text-slate-500">Mode Akses</p>
          <p className="font-semibold text-accent">
            {profile?.fullName || "Guest"}
          </p>
          <span className="neu-badge bg-red-500/10 text-red-400 mt-2 capitalize border border-red-500/20">
            {profile?.role || "Demo"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          {Object.entries(groupedMenus).map(([group, menus]) => (
            <div key={group}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
                {group}
              </p>
              <div className="space-y-1">
                {menus.map((m) => {
                  const isActive =
                    pathname === m.href || pathname.startsWith(m.href + "/");

                  // Mapping string icon ke komponen Lucide
                  const Icon =
                    (Icons as any)[m.icon || "Circle"] || Icons.Circle;

                  return (
                    <Link
                      key={m.href}
                      href={m.href}
                      className={`neu-nav ${isActive ? "neu-nav-active" : ""}`}
                    >
                      <Icon className="w-5 h-5" /> {m.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={logout}
          className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 font-semibold border border-red-500/30 w-full hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Keluar
        </button>
      </aside>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1">
        <div className="flex justify-around items-center w-full">
          {allowedMenus.slice(0, 5).map((m) => {
            const isActive =
              pathname === m.href || pathname.startsWith(m.href + "/");
            const Icon = (Icons as any)[m.icon || "Circle"] || Icons.Circle;

            return (
              <Link
                key={m.href}
                href={m.href}
                className={`flex flex-col items-center justify-center flex-1 py-2 px-1 gap-1 transition-colors ${isActive ? "text-accent" : "text-slate-500"}`}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-[9px] md:text-[10px] font-medium text-center leading-tight">
                  {m.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
