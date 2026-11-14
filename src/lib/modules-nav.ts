import { NavItem } from "./modules/types";

export const MODULE_NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    group: "Operasional",
    icon: "Home",
    access: {
      type: "menu",
      menuKey: "dashboard",
      roles: ["owner", "admin", "cashier"],
    },
  },
  {
    key: "transaksi",
    label: "Transaksi",
    href: "/transaksi",
    group: "Operasional",
    icon: "PlusCircle",
    access: {
      type: "menu",
      menuKey: "transaksi",
      roles: ["owner", "admin", "cashier"],
    },
  },
  {
    key: "info-kerja",
    label: "Monitoring",
    href: "/info-kerja",
    group: "Produksi",
    icon: "Monitor",
    access: {
      type: "menu",
      menuKey: "info-kerja",
      roles: ["owner", "admin", "cashier", "technician"],
    },
  },
  {
    key: "my-jobs",
    label: "Pekerjaan Saya",
    href: "/info-kerja/my-jobs",
    group: "Produksi",
    icon: "Wrench",
    access: { type: "menu", menuKey: "my-jobs", roles: ["technician"] },
  },
  {
    key: "treatments",
    label: "Treatment",
    href: "/treatments",
    group: "Master Data",
    icon: "Tags",
    access: { type: "menu", menuKey: "treatments", roles: ["owner", "admin"] },
  },
  {
    key: "laporan",
    label: "Laporan",
    href: "/laporan",
    group: "Laporan",
    icon: "BarChart3",
    access: {
      type: "menu",
      menuKey: "laporan",
      roles: ["owner", "admin", "cashier"],
    },
  },
];
