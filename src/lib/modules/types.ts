export type UserRole = "owner" | "admin" | "cashier" | "technician" | "pegawai";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  group: string;
  icon?: string;
  access:
    | { type: "public" }
    | { type: "owner_admin_only" }
    | { type: "menu"; menuKey: string; roles: UserRole[] };
}

export type ApiAccessRule =
  | { type: "public" }
  | { type: "owner_admin_only" }
  | { type: "role"; roles: UserRole[] };
