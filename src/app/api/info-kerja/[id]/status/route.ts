import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/api-guard";
import { db } from "@/db";
import { shoes, shoeAssignments, shoeStatusHistory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Satpam API (Pastikan role diizinkan)
  const { error, session } = await guardApi("/api/info-kerja/[id]/status");
  if (error) return error;

  try {
    const { id: shoeId } = await params;
    const body = await req.json();
    const newStatus = body.status;

    // 2. Cek sepatu ada atau tidak
    const [currentShoe] = await db
      .select()
      .from(shoes)
      .where(eq(shoes.id, shoeId))
      .limit(1);

    if (!currentShoe) {
      return NextResponse.json(
        { error: "Sepatu tidak ditemukan" },
        { status: 404 },
      );
    }

    // 3. Jika yang mengubah adalah TEKNISI, pastikan dia yang memegang sepatu ini
    if (session.role === "technician") {
      const [assignment] = await db
        .select()
        .from(shoeAssignments)
        .where(
          and(
            eq(shoeAssignments.shoeId, shoeId),
            eq(shoeAssignments.technicianId, session.id as string),
            eq(shoeAssignments.assignmentStatus, "active"),
          ),
        )
        .limit(1);

      if (!assignment) {
        return NextResponse.json(
          { error: "Akses Ditolak: Anda tidak sedang mengerjakan sepatu ini." },
          { status: 403 },
        );
      }
    }

    // 4. Update status sepatu
    await db
      .update(shoes)
      .set({ shoeStatus: newStatus })
      .where(eq(shoes.id, shoeId));

    // 5. Catat riwayat status
    await db.insert(shoeStatusHistory).values({
      shoeId: shoeId,
      previousStatus: currentShoe.shoeStatus,
      newStatus: newStatus,
      changedBy: session.id as string,
      notes: `Update status oleh ${session.role}`,
    });

    // 6. Jika selesai, matikan assignment (hanya untuk teknisi)
    if (newStatus === "selesai_dicuci" && session.role === "technician") {
      await db
        .update(shoeAssignments)
        .set({ assignmentStatus: "completed", completedAt: new Date() })
        .where(eq(shoeAssignments.shoeId, shoeId));
    }

    // 7. Catat log aktivitas
    await logActivity({
      userId: session.id as string,
      action: "Update Status",
      description: `Mengubah status sepatu menjadi ${newStatus}`,
      relatedTransactionId: shoeId,
    });

    return NextResponse.json({
      success: true,
      message: "Status berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("PATCH status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
