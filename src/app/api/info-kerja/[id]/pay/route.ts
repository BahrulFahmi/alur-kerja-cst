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
  // 1. Satpam API (Hanya Kasir/Admin)
  const { error, session } = await guardApi("/api/info-kerja/[id]/pay");
  if (error) return error;

  try {
    const { id: orderId } = await params; // Asumsi ID di sini adalah Order ID
    const body = await req.json();

    // 2. Update status pembayaran
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentMethod: body.paymentMethod,
      })
      .where(eq(orders.id, orderId));

    // 3. Log
    await logActivity({
      userId: session.id as string,
      action: "Konfirmasi Pembayaran",
      description: `Menerima pembayaran via ${body.paymentMethod}`,
      relatedTransactionId: orderId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
