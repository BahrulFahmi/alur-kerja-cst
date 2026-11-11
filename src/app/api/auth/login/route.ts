import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const [user] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    // KITA UBAH BAGIAN INI UNTUK MELIHAT ERROR ASLINYA
    if (!user) {
      return NextResponse.json(
        { error: "DEBUG: Email tidak ditemukan di database" },
        { status: 401 },
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "DEBUG: Hash password kosong" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // KITA TAMPILKAN HASH YANG DIBACA OLEH SERVER
      return NextResponse.json(
        {
          error: "DEBUG: Password salah",
          hashDiDatabase: user.passwordHash,
        },
        { status: 401 },
      );
    }

    // ... (sisa kode token dan cookie tetap sama)
    const token = await createToken({
      id: user.id as string,
      role: user.role as string,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, role: user.role, fullName: user.fullName },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
