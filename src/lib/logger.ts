import { db } from "@/db";
import { activityLogs, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function logActivity({
  userId,
  action,
  description,
  relatedTransactionId,
}: {
  userId?: string;
  action: string;
  description?: string;
  relatedTransactionId?: string;
}) {
  try {
    let userName = "Sistem";
    let userRole = "-";

    // Jika ada userId, cari nama dan role-nya di database
    if (userId) {
      const [user] = await db
        .select({ fullName: profiles.fullName, role: profiles.role })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);

      if (user) {
        userName = user.fullName || "User";
        userRole = user.role || "-";
      }
    }

    await db.insert(activityLogs).values({
      userId: userId || null,
      userName,
      userRole,
      action,
      description,
      relatedTransactionId,
    });
  } catch (error) {
    console.error("Gagal menyimpan log:", error);
  }
}
