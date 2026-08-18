import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const leadScoreSettings = pgTable("lead_score_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }).unique(),
  activityWeight: real("activity_weight").notNull().default(1),
  dealWeight: real("deal_weight").notNull().default(2),
  invoiceWeight: real("invoice_weight").notNull().default(3),
  recencyDecayDays: real("recency_decay_days").notNull().default(90),
  maxScore: real("max_score").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
