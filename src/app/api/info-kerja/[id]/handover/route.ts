import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/api-guard";
import { db } from "@/db";
import { shoes, orderHandover, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Satpam API (Hanya Admin & Kasir)
  const { error, session } = await guardApi("/api/info-kerja/[id]/handover");
  if (error) return error;

  try {
    const { id: shoeId } = await params;

    const [shoe] = await db
      .select({
        id: shoes.id,
        shoeStatus: shoes.shoeStatus,
        orderId: shoes.orderId,
        paymentStatus: orders.paymentStatus,
      })
      .from(shoes)
      .leftJoin(orders, eq(shoes.orderId, orders.id))
      .where(eq(shoes.id, shoeId))
      .limit(1);

    if (!shoe)
      return NextResponse.json(
        { error: "Sepatu tidak ditemukan" },
        { status: 404 },
      );
    if (shoe.shoeStatus !== "siap_diambil") {
      return NextResponse.json(
        { error: "Sepatu belum siap diambil" },
        { status: 400 },
      );
    }
    if (shoe.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Pembayaran belum lunas" },
        { status: 400 },
      );
    }

    // 2. Catat penyerahan
    await db.insert(orderHandover).values({
      shoeId: shoeId,
      handedOverAt: new Date(),
    });

    // 3. Ubah status sepatu
    await db
      .update(shoes)
      .set({ shoeStatus: "sudah_diambil" })
      .where(eq(shoes.id, shoeId));

    // 4. Log
    await logActivity({
      userId: session.id as string,
      action: "Serah Terima",
      description: `Menyerahkan sepatu ke pelanggan`,
      relatedTransactionId: shoeId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
