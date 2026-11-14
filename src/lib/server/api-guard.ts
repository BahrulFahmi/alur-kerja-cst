import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Sesuaikan dengan fungsi verify Anda
import { cookies } from "next/headers";
import { MODULE_ATURAN_API } from "@/lib/modules-api";
import { UserRole } from "@/lib/modules/types";

export async function guardApi(path: string) {
  // 1. Ambil token dari cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Sesi habis" },
        { status: 401 },
      ),
    };
  }

  // 2. Verifikasi token
  const payload = await verifyToken(token);
  if (!payload || !payload.id) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Token tidak valid" },
        { status: 401 },
      ),
    };
  }

  const userRole = payload.role as UserRole;

  // 3. Cari aturan untuk path ini
  const rule = MODULE_ATURAN_API[path];

  if (rule) {
    if (rule.type === "public") {
      return { session: payload };
    }

    if (
      rule.type === "owner_admin_only" &&
      !["owner", "admin"].includes(userRole)
    ) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: Hanya Owner/Admin" },
          { status: 403 },
        ),
      };
    }

    if (rule.type === "role" && !rule.roles.includes(userRole)) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: Anda tidak memiliki akses ke aksi ini" },
          { status: 403 },
        ),
      };
    }
  }

  // 4. Jika lolos, kembalikan data session (userId dan role)
  return { session: payload };
}
