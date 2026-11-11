import { NextResponse } from "next/server";
import { db } from "@/db";
import { treatments, promotions } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const treatmentsList = await db
      .select()
      .from(treatments)
      .orderBy(asc(treatments.name));
    const promosList = await db
      .select()
      .from(promotions)
      .orderBy(desc(promotions.createdAt));

    return NextResponse.json({
      treatments: treatmentsList,
      promotions: promosList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === "treatment") {
      const [inserted] = await db
        .insert(treatments)
        .values({
          name: body.name,
          description: body.description ?? null,
          // Konversi number ke string untuk kolom numeric
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
          // Konversi number ke string untuk kolom numeric
          discountValue: String(body.discountValue || 0),
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          isActive: Boolean(body.isActive),
          applyToAll: Boolean(body.applyToAll),
        })
        .returning();

      return NextResponse.json({ promo: inserted }, { status: 201 });
    }

    return NextResponse.json(
      { error: "type harus 'treatment' atau 'promo'" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("POST /api/treatments error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal menyimpan data" },
      { status: 500 },
    );
  }
}
