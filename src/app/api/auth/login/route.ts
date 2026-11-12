import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

// WAJIB: Gunakan Node.js agar bcrypt berjalan sempurna
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Bersihkan inputan dari spasi yang tidak sengaja terketik
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 },
      );
    }

    // 2. Cari user di database
    const [user] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }

    // 3. Cek kecocokan password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }

    // 4. Buat token JWT
    const token = await createToken({
      id: user.id as string,
      role: user.role as string,
    });

    // 5. Kirim respons dan set cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, role: user.role, fullName: user.fullName },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Aman untuk Vercel (HTTPS)
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 },
    );
  }
}
