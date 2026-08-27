import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const voiceNotes = pgTable(
  "voice_notes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    userId: text("user_id"),
    transcription: text("transcription"),
    audioUrl: text("audio_url"),
    duration: integer("duration"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("voice_notes_workspace_idx").on(t.workspaceId),
    index("voice_notes_user_idx").on(t.userId),
    index("voice_notes_entity_idx").on(t.entityType, t.entityId),
  ]
);

export type VoiceNote = typeof voiceNotes.$inferSelect;
