import { pgTable, text, timestamp, uuid, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const goalPeriodEnum = pgEnum("goal_period", ["monthly", "quarterly", "yearly"]);

export const salesGoals = pgTable("sales_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  userId: text("user_id").notNull().references(() => user.id),
  period: goalPeriodEnum("period").notNull().default("monthly"),
  targetAmount: numeric("target_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
