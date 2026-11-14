import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/api-guard";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Satpam API
  const { error, session } = await guardApi("/api/info-kerja/[id]/pay");
  if (error) return error;

  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const { paymentMethod } = body;

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Metode pembayaran wajib dipilih" },
        { status: 400 },
      );
    }

    // 2. Update status bayar di tabel orders
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentMethod: paymentMethod,
      })
      .where(eq(orders.id, orderId));

    // 3. Log
    await logActivity({
      userId: session.id as string,
      action: "Konfirmasi Pembayaran",
      description: `Menerima pembayaran via ${paymentMethod}`,
      relatedTransactionId: orderId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PAY Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
