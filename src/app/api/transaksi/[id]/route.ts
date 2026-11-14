import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, customers, shoes, treatments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Ambil data Order & Customer
    const orderData = await db
      .select({
        order: orders,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (orderData.length === 0) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    // 2. Ambil data Sepatu (Shoes) & Treatment
    const shoesData = await db
      .select({
        shoe: shoes,
        treatment: treatments,
      })
      .from(shoes)
      .leftJoin(treatments, eq(shoes.treatmentId, treatments.id))
      .where(eq(shoes.orderId, id));

    // Gabungkan data sepatu dengan treatment-nya
    const combinedShoes = shoesData.map((s) => ({
      ...s.shoe,
      treatment: s.treatment,
    }));

    // Gabungkan semuanya menjadi 1 objek
    const result = {
      ...orderData[0].order,
      customer: orderData[0].customer,
      shoes: combinedShoes,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/transaksi/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// (Opsional) Jika Anda butuh fitur hapus sepatu dari client
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // Ini adalah shoeId
    await db.delete(shoes).where(eq(shoes.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
