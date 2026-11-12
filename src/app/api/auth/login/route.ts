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

    const [user] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Email tidak ditemukan" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // KITA KEMBALIKAN HASH YANG DIBACA OLEH VERCEL KE BROWSER
      return NextResponse.json(
        {
          error: "Password salah",
          hashDibacaVercel: user.passwordHash,
          passwordYangDikirim: password,
        },
        { status: 401 },
      );
    }

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
