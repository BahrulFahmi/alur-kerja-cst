import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/api-guard";
import { db } from "@/db";
import { orders, shoes, treatments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await guardApi("/api/laporan/[id]");
  if (error) return error;

  try {
    const { id: orderId } = await params;
    const body = await req.json();

    // 1. Update data order
    await db
      .update(orders)
      .set({
        totalPrice: String(body.totalPrice),
        paymentStatus: body.paymentStatus,
        paymentMethod: body.paymentMethod || null,
        promoNotes: body.promoNotes || null,
      })
      .where(eq(orders.id, orderId));

    // 2. Update treatment sepatu (jika ada)
    if (body.shoeId && body.treatmentId) {
      const [treatment] = await db
        .select()
        .from(treatments)
        .where(eq(treatments.id, body.treatmentId))
        .limit(1);

      if (treatment) {
        await db
          .update(shoes)
          .set({
            treatmentId: body.treatmentId,
            treatmentPrice: String(treatment.price),
          })
          .where(eq(shoes.id, body.shoeId));
      }
    }

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

// DELETE (tetap sama)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await guardApi("/api/laporan/[id]");
  if (error) return error;
  try {
    const { id: orderId } = await params;
    await db.delete(shoes).where(eq(shoes.orderId, orderId));
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
