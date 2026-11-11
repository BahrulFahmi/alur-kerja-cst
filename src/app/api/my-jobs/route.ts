import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  shoeAssignments,
  shoes,
  orders,
  customers,
  treatments,
} from "@/db/schema";
import { eq, and, ne } from "drizzle-orm"; // Hapus import desc

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID tidak ditemukan" },
        { status: 401 },
      );
    }

    const rawJobs = await db
      .select({
        id: shoeAssignments.id,
        assignmentStatus: shoeAssignments.assignmentStatus,
        shoeId: shoes.id,
        shoeCode: shoes.shoeCode,
        brand: shoes.brand,
        shoeType: shoes.shoeType,
        shoeStatus: shoes.shoeStatus,
        createdAt: shoes.createdAt,
        invoiceNumber: orders.invoiceNumber,
        customerName: customers.name,
        treatmentName: treatments.name,
        durationMaxDays: treatments.durationMaxDays,
      })
      .from(shoeAssignments)
      .innerJoin(shoes, eq(shoeAssignments.shoeId, shoes.id))
      .leftJoin(orders, eq(shoes.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(treatments, eq(shoes.treatmentId, treatments.id))
      .where(
        and(
          eq(shoeAssignments.technicianId, userId),
          eq(shoeAssignments.assignmentStatus, "active"),
          ne(shoes.shoeStatus, "selesai_dicuci"),
        ),
      );
    // .orderBy(desc(shoeAssignments.assignedAt)); <--- KOMENTARI ATAU HAPUS BARIS INI

    const formattedJobs = rawJobs.map((job) => ({
      id: job.id,
      assignment_status: job.assignmentStatus,
      shoe: {
        id: job.shoeId,
        shoe_code: job.shoeCode,
        brand: job.brand,
        shoe_type: job.shoeType,
        shoe_status: job.shoeStatus,
        created_at: job.createdAt,
        order: {
          invoice_number: job.invoiceNumber,
          customer: { name: job.customerName },
        },
        treatment: {
          name: job.treatmentName,
          duration_max_days: job.durationMaxDays,
        },
      },
    }));

    return NextResponse.json(formattedJobs);
  } catch (error: any) {
    console.error("GET /api/my-jobs error:", error);
    return NextResponse.json(
      { error: `Database Error: ${error?.cause?.message || error?.message}` },
      { status: 500 },
    );
  }
}
