import { ApiAccessRule } from "./modules/types";

export const MODULE_ATURAN_API: Record<string, ApiAccessRule> = {
  "/api/transaksi": { type: "role", roles: ["owner", "admin", "cashier"] },
  "/api/transaksi/[id]": { type: "role", roles: ["owner", "admin", "cashier"] },
  "/api/info-kerja": {
    type: "role",
    roles: ["owner", "admin", "cashier", "technician"],
  },
  "/api/info-kerja/[id]/take": { type: "role", roles: ["technician"] },

  // DIPERBAIKI: Kasir & Admin sekarang bisa update status (untuk Siap Ambil)
  "/api/info-kerja/[id]/status": {
    type: "role",
    roles: ["technician", "cashier", "admin", "owner"],
  },

  "/api/info-kerja/[id]/handover": {
    type: "role",
    roles: ["owner", "admin", "cashier"],
  },
  "/api/info-kerja/[id]/pay": {
    type: "role",
    roles: ["owner", "admin", "cashier"],
  },
  "/api/my-jobs": { type: "role", roles: ["technician", "admin"] },
  "/api/treatments": { type: "role", roles: ["owner", "admin"] },
  "/api/treatments/[id]": { type: "role", roles: ["owner"] },
  "/api/laporan": { type: "role", roles: ["owner", "admin", "cashier"] },
  "/api/laporan/[id]": { type: "role", roles: ["owner"] },
  "/api/activity": { type: "role", roles: ["owner", "admin", "cashier"] },
  "/api/dashboard": { type: "role", roles: ["owner", "admin", "cashier"] },
};
