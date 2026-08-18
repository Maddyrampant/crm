import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leadScoreSettings } from "@/db/schema";

export type LeadScoreSettingsInput = {
  activityWeight?: number;
  dealWeight?: number;
  invoiceWeight?: number;
  recencyDecayDays?: number;
  maxScore?: number;
};

const DEFAULT_SETTINGS = {
  activityWeight: 5,
  dealWeight: 10,
  invoiceWeight: 1,
  recencyDecayDays: 90,
  maxScore: 100,
};

export async function getLeadScoreSettings(workspaceId: string) {
  const [row] = await db
    .select()
    .from(leadScoreSettings)
    .where(eq(leadScoreSettings.workspaceId, workspaceId))
    .limit(1);

  if (!row) return DEFAULT_SETTINGS;

  return {
    activityWeight: row.activityWeight,
    dealWeight: row.dealWeight,
    invoiceWeight: row.invoiceWeight,
    recencyDecayDays: row.recencyDecayDays,
    maxScore: row.maxScore,
  };
}

export async function updateLeadScoreSettings(
  workspaceId: string,
  settings: LeadScoreSettingsInput
) {
  const existing = await db
    .select({ id: leadScoreSettings.id })
    .from(leadScoreSettings)
    .where(eq(leadScoreSettings.workspaceId, workspaceId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(leadScoreSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(leadScoreSettings.workspaceId, workspaceId));
  } else {
    await db.insert(leadScoreSettings).values({
      workspaceId,
      activityWeight: settings.activityWeight ?? DEFAULT_SETTINGS.activityWeight,
      dealWeight: settings.dealWeight ?? DEFAULT_SETTINGS.dealWeight,
      invoiceWeight: settings.invoiceWeight ?? DEFAULT_SETTINGS.invoiceWeight,
      recencyDecayDays: settings.recencyDecayDays ?? DEFAULT_SETTINGS.recencyDecayDays,
      maxScore: settings.maxScore ?? DEFAULT_SETTINGS.maxScore,
    });
  }

  return { ok: true as const };
}
