import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

// Tabel Profiles (User)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name"),
  email: text("email"),
  passwordHash: text("password_hash"),
  role: text("role").default("cashier"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tabel Customers (Pelanggan)
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tabel Treatments
export const treatments = pgTable("treatments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull(),
  durationMinDays: integer("duration_min_days").default(1),
  durationMaxDays: integer("duration_max_days").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tabel Promotions
export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull(),
  discountValue: numeric("discount_value").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  applyToAll: boolean("apply_to_all").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tabel Orders (Nota)
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: uuid("customer_id").references(() => customers.id),
  orderDate: timestamp("order_date", { withTimezone: true }).defaultNow(),
  totalPrice: numeric("total_price").notNull(),
  paymentStatus: text("payment_status").default("unpaid"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  promoType: text("promo_type"),
  discountAmount: numeric("discount_amount").default("0"),
  promoNotes: text("promo_notes"),
  orderStatus: text("order_status").default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Tabel Shoes (Sepatu)
export const shoes = pgTable("shoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  shoeCode: text("shoe_code").notNull(),
  qrCode: text("qr_code").notNull(),
  brand: text("brand"),
  shoeType: text("shoe_type"),
  shoeSize: text("shoe_size"),
  color: text("color"),
  material: text("material"),
  conditionBefore: text("condition_before"),
  treatmentId: uuid("treatment_id").references(() => treatments.id),
  treatmentPrice: numeric("treatment_price").default("0"),
  shoeStatus: text("shoe_status").default("menunggu_pengerjaan"),
  beforePhotos: text("before_photos").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tabel Shoe Assignments (Penugasan Teknisi)
export const shoeAssignments = pgTable("shoe_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoeId: uuid("shoe_id").references(() => shoes.id),
  technicianId: uuid("technician_id").references(() => profiles.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  assignmentStatus: text("assignment_status").default("active"),
});

// Tabel Shoe Status History
export const shoeStatusHistory = pgTable("shoe_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoeId: uuid("shoe_id").references(() => shoes.id),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  changedBy: uuid("changed_by").references(() => profiles.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tabel Order Handover
export const orderHandover = pgTable("order_handover", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoeId: uuid("shoe_id").references(() => shoes.id),
  handedOverAt: timestamp("handed_over_at", {
    withTimezone: true,
  }).defaultNow(),
  notes: text("notes"),
});

// Tabel Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id),
  userName: text("user_name"),
  userRole: text("user_role"),
  action: text("action"),
  description: text("description"),
  relatedTransactionId: text("related_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
