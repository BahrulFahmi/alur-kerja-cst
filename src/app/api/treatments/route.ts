import { NextResponse } from "next/server";
import { db } from "@/db";
import { treatments, promotions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 1. GET: Ambil Data
export async function GET() {
  try {
    const treatmentsList = await db.select().from(treatments);
    const promosList = await db.select().from(promotions);
    return NextResponse.json({
      treatments: treatmentsList,
      promotions: promosList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Tambah Data
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === "treatment") {
      const [inserted] = await db
        .insert(treatments)
        .values({
          name: body.name,
          description: body.description ?? null,
          category: body.category ?? "Lain-lain",
          price: String(body.price || 0),
          durationMinDays: Number(body.durationMinDays) || 1,
          durationMaxDays: Number(body.durationMaxDays) || 1,
          isActive: Boolean(body.isActive),
        })
        .returning();
      return NextResponse.json({ treatment: inserted }, { status: 201 });
    }

    if (body.type === "promo") {
      const [inserted] = await db
        .insert(promotions)
        .values({
          name: body.name,
          description: body.description ?? null,
          discountType: body.discountType ?? "fixed",
          discountValue: String(body.discountValue || 0),
          isActive: Boolean(body.isActive),
          applyToAll: Boolean(body.applyToAll),
        })
        .returning();
      return NextResponse.json({ promo: inserted }, { status: 201 });
    }

    return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PATCH: Ubah Status Aktif/Nonaktif
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { type, id, isActive } = body;

    if (type === "treatment") {
      await db
        .update(treatments)
        .set({ isActive: Boolean(isActive) })
        .where(eq(treatments.id, id));
      return NextResponse.json({ success: true });
    }

    if (type === "promo") {
      await db
        .update(promotions)
        .set({ isActive: Boolean(isActive) })
        .where(eq(promotions.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
