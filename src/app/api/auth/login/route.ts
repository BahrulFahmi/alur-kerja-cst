import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    // 1. Cek apakah email ditemukan
    const [user] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          error: `DEBUG: Email "${email}" tidak ditemukan di database.`,
        },
        { status: 401 },
      );
    }

    // 2. Cek apakah hash ada
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error: `DEBUG: User ditemukan, tapi hash password kosong.`,
        },
        { status: 401 },
      );
    }

    // 3. Cek password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: `DEBUG: Password salah untuk email ${email}.`,
          hashDiDatabase: user.passwordHash,
        },
        { status: 401 },
      );
    }

    // 4. Jika lolos, buat token
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
    return NextResponse.json(
      { error: `DEBUG Error: ${error.message}` },
      { status: 500 },
    );
  }
}
