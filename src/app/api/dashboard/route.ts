import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, shoes, activityLogs } from "@/db/schema";
import { eq, inArray, gte, sql } from "drizzle-orm";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Statistik Order Hari Ini
    const todayOrdersData = await db
      .select()
      .from(orders)
      .where(gte(orders.createdAt, today));

    const todayRevenue = todayOrdersData
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const unpaidCount = todayOrdersData.filter(
      (o) => o.paymentStatus === "unpaid",
    ).length;

    // 2. Statistik Sepatu
    const pendingData = await db
      .select({ count: sql<number>`count(*)` })
      .from(shoes)
      .where(eq(shoes.shoeStatus, "menunggu_pengerjaan"));

    const workingData = await db
      .select({ count: sql<number>`count(*)` })
      .from(shoes)
      .where(
        inArray(shoes.shoeStatus, [
          "sedang_dikerjakan",
          "proses_pencucian",
          "proses_pengeringan",
          "proses_finishing",
        ]),
      );

    const doneWashingData = await db
      .select({ count: sql<number>`count(*)` })
      .from(shoes)
      .where(inArray(shoes.shoeStatus, ["selesai_dicuci", "siap_diambil"]));

    // 3. Aktivitas Terbaru
    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(sql`${activityLogs.createdAt} desc`)
      .limit(5);

    return NextResponse.json({
      stats: {
        todayRevenue,
        todayOrders: todayOrdersData.length,
        pending: Number(pendingData[0]?.count || 0),
        working: Number(workingData[0]?.count || 0),
        doneWashing: Number(doneWashingData[0]?.count || 0),
        unpaidCount,
      },
      recentLogs: logs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
