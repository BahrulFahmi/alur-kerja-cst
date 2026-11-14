import { NextResponse } from "next/server";
import { guardApi } from "@/lib/server/api-guard";
import { db } from "@/db";
import { shoes, shoeAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Satpam API
  const { error, session } = await guardApi("/api/info-kerja/[id]/take");
  if (error) return error;

  try {
    const { id: shoeId } = await params;

    // 2. Cek apakah sepatu masih menunggu
    const [shoe] = await db
      .select()
      .from(shoes)
      .where(eq(shoes.id, shoeId))
      .limit(1);

    if (!shoe) {
      return NextResponse.json(
        { error: "Sepatu tidak ditemukan" },
        { status: 404 },
      );
    }

    if (shoe.shoeStatus !== "menunggu_pengerjaan") {
      return NextResponse.json(
        { error: "Sepatu sudah dikerjakan teknisi lain" },
        { status: 400 },
      );
    }

    // 3. Buat Assignment baru untuk teknisi ini
    await db.insert(shoeAssignments).values({
      shoeId: shoeId,
      technicianId: session.id as string,
      assignmentStatus: "active",
      startedAt: new Date(),
    });

    // 4. Ubah status sepatu menjadi sedang_dikerjakan
    await db
      .update(shoes)
      .set({ shoeStatus: "sedang_dikerjakan" })
      .where(eq(shoes.id, shoeId));

    // 5. Log
    await logActivity({
      userId: session.id as string,
      action: "Ambil Pekerjaan",
      description: `Mengambil pekerjaan sepatu`,
      relatedTransactionId: shoeId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
