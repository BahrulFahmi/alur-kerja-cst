import { NextResponse } from "next/server";
import { db } from "@/db";
import { shoes, orderHandover } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await db
    .update(shoes)
    .set({ shoeStatus: "sudah_diambil" })
    .where(eq(shoes.id, id));
  await db.insert(orderHandover).values({
    shoeId: id,
    handedOverAt: new Date(),
    notes: "Diserahkan",
  });

  return NextResponse.json({ success: true });
}
