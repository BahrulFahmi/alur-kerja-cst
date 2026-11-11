import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, shoes, customers, treatments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 1. GET: Ambil data master (Treatment)
export async function GET() {
  try {
    const treatmentsList = await db
      .select()
      .from(treatments)
      .where(eq(treatments.isActive, true));

    return NextResponse.json({ treatments: treatmentsList });
  } catch (error: any) {
    console.error("GET Transaksi Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Simpan Transaksi Baru
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validasi input dasar
    if (!body.customerName || !body.customerWhatsapp) {
      return NextResponse.json(
        { error: "Nama dan WhatsApp wajib diisi" },
        { status: 400 },
      );
    }

    // 1. Simpan / Cek Pelanggan
    let customerId;
    const existingCustomer = await db
      .select()
      .from(customers) // Pastikan `customers` sudah di-import di atas
      .where(eq(customers.whatsapp, body.customerWhatsapp))
      .limit(1);

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          name: body.customerName,
          whatsapp: body.customerWhatsapp,
        })
        .returning();
      customerId = newCustomer.id;
    }

    // 2. Buat Invoice
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const invoiceNumber = `CST-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Simpan Order
    const [newOrder] = await db
      .insert(orders)
      .values({
        invoiceNumber,
        customerId,
        notes: body.notes || null,
        totalPrice: body.totalPrice || 0,
        discountAmount: body.discountAmount || 0,
        promoNotes: body.promoNotes || null,
        paymentStatus: body.paymentStatus,
        paymentMethod: body.paymentMethod || null,
      })
      .returning();

    // 4. Simpan Item (Shoes)
    if (body.items && body.items.length > 0) {
      const shoesToInsert = body.items.map((item: any) => ({
        orderId: newOrder.id,
        treatmentId: item.treatmentId,
        treatmentPrice: item.treatmentPrice,
        brand: item.brand,
        shoeType: item.model,
        itemType: item.itemType || "Sepatu",
        shoeSize: item.size || null,
        color: item.color || null,
        material: item.material || null,
        conditionBefore: item.conditionBefore || null,
        shoeStatus: "menunggu_pengerjaan",
        qrCode: `QR-${newOrder.invoiceNumber}-${Math.floor(Math.random() * 10000)}`,
        shoeCode: `SH-${Math.floor(Math.random() * 10000)}`,
      }));

      await db.insert(shoes).values(shoesToInsert);
    }

    return NextResponse.json({ success: true, orderId: newOrder.id });
  } catch (error: any) {
    console.error("POST Transaksi Error:", error);
    return NextResponse.json(
      { error: `Database Error: ${error?.message}` },
      { status: 500 },
    );
  }
}
