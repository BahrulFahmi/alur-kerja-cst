import { NextResponse } from "next/server";
import { db } from "@/db";
import { shoes, shoeStatusHistory, shoeAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status } = await req.json();

  await db.update(shoes).set({ shoeStatus: status }).where(eq(shoes.id, id));
  await db.insert(shoeStatusHistory).values({
    shoeId: id,
    newStatus: status,
    notes: `Update status ke ${status}`,
  });

  if (status === "selesai_dicuci") {
    await db
      .update(shoeAssignments)
      .set({ assignmentStatus: "completed", completedAt: new Date() })
      .where(
        and(
          eq(shoeAssignments.shoeId, id),
          eq(shoeAssignments.assignmentStatus, "active"),
        ),
      );
  }

  return NextResponse.json({ success: true });
}
