import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  shoes,
  orders,
  customers,
  treatments,
  shoeAssignments,
  profiles,
  orderHandover,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Ambil data sepatu + relasi (order, customer, treatment)
    const rawShoes = await db
      .select({
        id: shoes.id,
        brand: shoes.brand,
        shoeType: shoes.shoeType,
        shoeStatus: shoes.shoeStatus,
        createdAt: shoes.createdAt,
        qrCode: shoes.qrCode,
        shoeCode: shoes.shoeCode,
        treatmentPrice: shoes.treatmentPrice,
        orderId: orders.id, // <-- Ambil ID order
        invoiceNumber: orders.invoiceNumber,
        paymentStatus: orders.paymentStatus,
        totalPrice: orders.totalPrice, // <-- Ambil total price
        customerName: customers.name,
        treatmentName: treatments.name,
        durationMaxDays: treatments.durationMaxDays,
      })
      .from(shoes)
      .leftJoin(orders, eq(shoes.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(treatments, eq(shoes.treatmentId, treatments.id))
      .orderBy(desc(shoes.createdAt));

    // 2. Ambil data assignment (teknisi)
    const assignments = await db
      .select({
        shoeId: shoeAssignments.shoeId,
        assignmentStatus: shoeAssignments.assignmentStatus,
        technicianId: profiles.id,
        technicianName: profiles.fullName,
      })
      .from(shoeAssignments)
      .leftJoin(profiles, eq(shoeAssignments.technicianId, profiles.id));

    // 3. Ambil data handover
    const handovers = await db
      .select({
        shoeId: orderHandover.shoeId,
        handedOverAt: orderHandover.handedOverAt,
      })
      .from(orderHandover);

    // 4. Gabungkan data menjadi bentuk nested (seperti Supabase)
    const combinedData = rawShoes.map((s) => ({
      id: s.id,
      brand: s.brand,
      shoeType: s.shoeType,
      shoeStatus: s.shoeStatus,
      createdAt: s.createdAt,
      qrCode: s.qrCode,
      shoeCode: s.shoeCode,
      treatmentPrice: s.treatmentPrice,
      order: s.orderId
        ? {
            id: s.orderId,
            invoiceNumber: s.invoiceNumber,
            paymentStatus: s.paymentStatus,
          }
        : null,
      customer: s.customerName ? { name: s.customerName } : null,
      treatment: s.treatmentName
        ? {
            name: s.treatmentName,
            durationMaxDays: s.durationMaxDays,
          }
        : null,
      assignment: assignments.filter((a) => a.shoeId === s.id),
      handover: handovers.filter((h) => h.shoeId === s.id),
    }));

    return NextResponse.json(combinedData);
  } catch (error: any) {
    console.error("GET /api/info-kerja error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memuat data" },
      { status: 500 },
    );
  }
}
