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
import { guardApi } from "@/lib/server/api-guard"; // <-- Tambahan Satpam

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Jalankan Satpam API (Cek sesi dan role)
  const { error } = await guardApi("/api/laporan");
  if (error) return error;

  try {
    // 2. Ambil data sepatu + relasi
    const rawShoes = await db
      .select({
        id: shoes.id,
        brand: shoes.brand,
        shoeType: shoes.shoeType,
        shoeStatus: shoes.shoeStatus,
        createdAt: shoes.createdAt,
        treatmentPrice: shoes.treatmentPrice,
        orderId: orders.id,
        invoiceNumber: orders.invoiceNumber,
        orderDate: orders.orderDate,
        orderUpdatedAt: orders.updatedAt,
        totalPrice: orders.totalPrice,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        customerName: customers.name,
        treatmentName: treatments.name,
      })
      .from(shoes)
      .leftJoin(orders, eq(shoes.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(treatments, eq(shoes.treatmentId, treatments.id))
      .orderBy(desc(shoes.createdAt));

    // 3. Ambil assignment
    const assignments = await db
      .select({
        shoeId: shoeAssignments.shoeId,
        assignmentStatus: shoeAssignments.assignmentStatus,
        technicianName: profiles.fullName,
      })
      .from(shoeAssignments)
      .leftJoin(profiles, eq(shoeAssignments.technicianId, profiles.id));

    // 4. Ambil handover
    const handovers = await db
      .select({
        shoeId: orderHandover.shoeId,
        handedOverAt: orderHandover.handedOverAt,
      })
      .from(orderHandover);

    // 5. Daftar Master Treatment & Teknisi
    const treatmentsList = await db.select().from(treatments);
    const techniciansList = await db
      .select()
      .from(profiles)
      .where(eq(profiles.role, "technician"));

    // 6. Customer + Orders
    const customersData = await db.select().from(customers);
    const ordersData = await db.select().from(orders);

    const customersList = customersData.map((c) => ({
      ...c,
      orders: ordersData.filter((o) => o.customerId === c.id),
    }));

    // 7. Gabungkan relasi ke objek shoes
    const combinedData = rawShoes.map((s) => ({
      id: s.id,
      brand: s.brand,
      shoeType: s.shoeType,
      shoeStatus: s.shoeStatus,
      createdAt: s.createdAt,
      treatmentPrice: s.treatmentPrice,
      order: s.orderId
        ? {
            id: s.orderId,
            invoiceNumber: s.invoiceNumber,
            orderDate: s.orderDate,
            updatedAt: s.orderUpdatedAt,
            totalPrice: s.totalPrice,
            paymentStatus: s.paymentStatus,
            paymentMethod: s.paymentMethod,
          }
        : null,
      customer: s.customerName ? { name: s.customerName } : null,
      treatment: s.treatmentName ? { name: s.treatmentName } : null,
      assignment: assignments.filter((a) => a.shoeId === s.id),
      handover: handovers.filter((h) => h.shoeId === s.id),
    }));

    return NextResponse.json({
      rawData: combinedData,
      treatments: treatmentsList,
      technicians: techniciansList,
      customers: customersList,
    });
  } catch (error: any) {
    console.error("GET /api/laporan error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memuat data" },
      { status: 500 },
    );
  }
}
