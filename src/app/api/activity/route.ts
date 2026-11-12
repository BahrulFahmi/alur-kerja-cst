import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);

    // Format ulang agar sesuai dengan UI (snake_case)
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      user_name: log.userName,
      user_role: log.userRole,
      action: log.action,
      description: log.description,
      related_transaction_id: log.relatedTransactionId,
      created_at: log.createdAt,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error: any) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memuat data" },
      { status: 500 },
    );
  }
}
