import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { paymentMethod } = await req.json();

  await db
    .update(orders)
    .set({ paymentStatus: "paid", paymentMethod, updatedAt: new Date() })
    .where(eq(orders.id, id));

  return NextResponse.json({ success: true });
}
