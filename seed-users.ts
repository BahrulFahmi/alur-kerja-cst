import "dotenv/config";
import { db } from "./src/db";
import { profiles } from "./src/db/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto"; // <-- Tambahan untuk generate ID

async function seedUsers() {
  console.log("⏳ Mulai membuat user...");

  const usersToCreate = [
    {
      email: "admin@chatshoe.com",
      password: "admin123",
      fullName: "Admin Utama",
      role: "admin",
    },
    {
      email: "kasir@chatshoe.com",
      password: "kasir123",
      fullName: "Kasir 1",
      role: "cashier",
    },
    {
      email: "yoga@chatshoe.com",
      password: "teknisi123",
      fullName: "Yoga",
      role: "technician",
    },
    {
      email: "rosyid@chatshoe.com",
      password: "teknisi123",
      fullName: "Rosyid",
      role: "technician",
    },
    {
      email: "rafly@chatshoe.com",
      password: "teknisi123",
      fullName: "Rafly",
      role: "technician",
    },
  ];

  try {
    for (const user of usersToCreate) {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await db
        .insert(profiles)
        .values({
          id: randomUUID(), // <-- ISI ID SECARA MANUAL
          email: user.email,
          passwordHash: hashedPassword,
          fullName: user.fullName,
          role: user.role,
        })
        .onConflictDoNothing();

      console.log(`✅ User ${user.fullName} (${user.role}) berhasil dibuat.`);
    }

    console.log("\n🎉 Semua user berhasil dibuat!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Gagal membuat user:", error);
    process.exit(1);
  }
}

seedUsers();
