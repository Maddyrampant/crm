import { pgTable, text, timestamp, pgEnum, integer, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";

export const surveyType = pgEnum("survey_type", ["csat", "nps", "ces"]);
export const surveyStatus = pgEnum("survey_status", ["pending", "sent", "completed"]);

export const csatSurveys = pgTable(
  "csat_surveys",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    dealId: text("deal_id"),
    type: surveyType("type").notNull().default("csat"),
    status: surveyStatus("status").notNull().default("pending"),
    score: integer("score"),
    comment: text("comment"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("csat_surveys_workspace_idx").on(t.workspaceId),
    index("csat_surveys_contact_idx").on(t.contactId),
    index("csat_surveys_deal_idx").on(t.dealId),
  ]
);

export type CsatSurvey = typeof csatSurveys.$inferSelect;
