import { NextResponse } from "next/server";
import { db } from "@/db";
import { shoes, shoeAssignments, shoeStatusHistory } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { technicianId } = await req.json();

  await db
    .update(shoes)
    .set({ shoeStatus: "sedang_dikerjakan" })
    .where(eq(shoes.id, id));
  await db.insert(shoeAssignments).values({
    shoeId: id,
    technicianId,
    startedAt: new Date(),
    assignmentStatus: "active",
  });
  await db.insert(shoeStatusHistory).values({
    shoeId: id,
    previousStatus: "menunggu_pengerjaan",
    newStatus: "sedang_dikerjakan",
    notes: "Diambil via scan",
  });

  return NextResponse.json({ success: true });
}
