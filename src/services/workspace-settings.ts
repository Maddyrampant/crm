import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceSettings } from "@/db/schema/workspace-settings";

export async function getSetting(workspaceId: string, key: string) {
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(
      and(
        eq(workspaceSettings.workspaceId, workspaceId),
        eq(workspaceSettings.key, key)
      )
    )
    .limit(1);
  return row?.value ?? null;
}

export async function getSettings(workspaceId: string, keys: string[]) {
  const rows = await db
    .select()
    .from(workspaceSettings)
    .where(
      and(
        eq(workspaceSettings.workspaceId, workspaceId),
        eq(workspaceSettings.key, keys[0])
      )
    );
  const map: Record<string, string | null> = {};
  for (const key of keys) {
    map[key] = null;
  }
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function getAllSettings(workspaceId: string) {
  const rows = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId));
  const map: Record<string, string | null> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function setSetting(
  workspaceId: string,
  key: string,
  value: string | null
) {
  const existing = await getSetting(workspaceId, key);
  if (existing !== null || value === null) {
    if (value === null) {
      await db
        .delete(workspaceSettings)
        .where(
          and(
            eq(workspaceSettings.workspaceId, workspaceId),
            eq(workspaceSettings.key, key)
          )
        );
      return;
    }
    await db
      .update(workspaceSettings)
      .set({ value, updatedAt: new Date() })
      .where(
        and(
          eq(workspaceSettings.workspaceId, workspaceId),
          eq(workspaceSettings.key, key)
        )
      );
  } else {
    await db.insert(workspaceSettings).values({ workspaceId, key, value });
  }
}

export async function setSettings(
  workspaceId: string,
  entries: Record<string, string | null>
) {
  for (const [key, value] of Object.entries(entries)) {
    await setSetting(workspaceId, key, value);
  }
}

export type AiSettings = {
  defaultModel: string;
  maxSteps: number;
  systemPromptSuffix: string;
  temperature: number;
};

const AI_DEFAULTS: AiSettings = {
  defaultModel: "openrouter:openai/gpt-4o-mini",
  maxSteps: 4,
  systemPromptSuffix: "",
  temperature: 0.7,
};

export async function getAiSettings(workspaceId: string): Promise<AiSettings> {
  const raw = await getAllSettings(workspaceId);
  return {
    defaultModel: raw.ai_default_model ?? AI_DEFAULTS.defaultModel,
    maxSteps: Number(raw.ai_max_steps ?? AI_DEFAULTS.maxSteps),
    systemPromptSuffix: raw.ai_system_prompt_suffix ?? AI_DEFAULTS.systemPromptSuffix,
    temperature: Number(raw.ai_temperature ?? AI_DEFAULTS.temperature),
  };
}

export async function setAiSettings(
  workspaceId: string,
  settings: Partial<AiSettings>
) {
  const entries: Record<string, string | null> = {};
  if (settings.defaultModel !== undefined) entries.ai_default_model = settings.defaultModel;
  if (settings.maxSteps !== undefined) entries.ai_max_steps = String(settings.maxSteps);
  if (settings.systemPromptSuffix !== undefined) entries.ai_system_prompt_suffix = settings.systemPromptSuffix;
  if (settings.temperature !== undefined) entries.ai_temperature = String(settings.temperature);
  await setSettings(workspaceId, entries);
}
