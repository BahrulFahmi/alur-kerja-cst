import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/api-guard";
import { db } from "@/db";
import { orders, shoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

// PATCH: Edit Transaksi (Update Total, Status Bayar, Metode)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await guardApi("/api/laporan/[id]");
  if (error) return error;

  try {
    const { id: orderId } = await params;
    const body = await req.json();

    await db
      .update(orders)
      .set({
        totalPrice: String(body.totalPrice),
        paymentStatus: body.paymentStatus,
        paymentMethod: body.paymentMethod,
      })
      .where(eq(orders.id, orderId));

    await logActivity({
      userId: session.id as string,
      action: "Edit Transaksi",
      description: `Owner mengedit data transaksi ${orderId}`,
      relatedTransactionId: orderId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus Transaksi & Semua Sepatu di dalamnya
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await guardApi("/api/laporan/[id]");
  if (error) return error;

  try {
    const { id: orderId } = await params;

    // 1. Hapus shoes (child)
    await db.delete(shoes).where(eq(shoes.orderId, orderId));
    // 2. Hapus order (parent)
    await db.delete(orders).where(eq(orders.id, orderId));

    await logActivity({
      userId: session.id as string,
      action: "Hapus Transaksi",
      description: `Owner menghapus data transaksi ${orderId}`,
      relatedTransactionId: orderId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
