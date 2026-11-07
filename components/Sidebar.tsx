"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  PlusCircle,
  BarChart3,
  LogOut,
  ClipboardCheck,
  Tags,
  ChevronDown,
  ChevronRight,
  Monitor,
} from "lucide-react";
import { useState } from "react";

// DEFINISI MENU BESERTA HAK AKSES ROLE
const allMenus = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
    roles: ["admin"],
  },
  {
    href: "/dashboard/orders/new",
    label: "Transaksi",
    icon: PlusCircle,
    roles: ["admin", "cashier"],
  },
  {
    href: "/dashboard/checking",
    label: "Monitoring", // <-- Diubah dari "Pantauan" menjadi "Monitoring"
    icon: Monitor,
    roles: ["admin", "cashier", "technician"],
  },
  {
    href: "/dashboard/treatments",
    label: "Treatment",
    icon: Tags,
    roles: ["admin"],
  },
  {
    href: "/dashboard/reports",
    label: "Laporan",
    icon: BarChart3,
    roles: ["admin", "cashier"],
  },
];

export default function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Filter menu berdasarkan role user yang login
  const userRole = profile?.role || "";
  const allowedMenus = allMenus.filter((menu) => menu.roles.includes(userRole));

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 p-4 gap-2 bg-slate-900/95 border-r border-slate-800 z-30">
        <div className="neu-card mb-4 border border-slate-700/50">
          <p className="text-xs text-slate-500">Mode Akses</p>
          <p className="font-semibold text-accent">
            {profile?.full_name || "Guest"}
          </p>
          <span className="neu-badge bg-red-500/10 text-red-400 mt-2 capitalize border border-red-500/20">
            {profile?.role || "Demo"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pb-4 pr-1">
          {allowedMenus.map((m: any, index: number) => {
            // Fitur Dropdown
            if (m.isDropdown) {
              const isOpen = openDropdown === m.label;
              const isChildActive = m.children.some((c: any) =>
                pathname.startsWith(c.href),
              );
              return (
                <div key={index} className="flex flex-col gap-1">
                  <button
                    onClick={() => setOpenDropdown(isOpen ? null : m.label)}
                    className={`neu-nav w-full justify-between ${isChildActive && !isOpen ? "text-accent" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <m.icon className="w-5 h-5" /> {m.label}
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-1 pl-4 mt-1 border-l border-slate-700/50 ml-4">
                      {m.children.map((child: any) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`neu-nav text-sm !py-2 ${pathname.startsWith(child.href) ? "neu-nav-active" : ""}`}
                        >
                          <child.icon className="w-4 h-4" /> {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Menu Biasa
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`neu-nav ${pathname === m.href || pathname.startsWith(m.href + "/") ? "neu-nav-active" : ""}`}
              >
                <m.icon className="w-5 h-5" /> {m.label}
              </Link>
            );
          })}
        </div>

        <button
          onClick={logout}
          className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 font-semibold border border-red-500/30 w-full"
        >
          <LogOut className="w-5 h-5" /> Keluar
        </button>
      </aside>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1">
        <div className="flex justify-between items-center">
          {allowedMenus.slice(0, 5).map((m: any) => {
            const href = m.isDropdown ? m.children[0].href : m.href;
            const Icon = m.isDropdown ? m.children[0].icon : m.icon;
            const label = m.label;
            const isActive = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center flex-1 py-2 px-1 gap-1 transition-colors ${isActive ? "text-accent" : "text-slate-500"}`}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-[9px] md:text-[10px] font-medium text-center leading-tight">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
