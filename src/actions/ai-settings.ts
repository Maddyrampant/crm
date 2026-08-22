"use server";

import { requireWorkspaceRole } from "@/lib/session";
import {
  getAiSettings,
  setAiSettings,
  type AiSettings,
} from "@/services/workspace-settings";

export async function getAiSettingsAction() {
  const { workspaceId } = await requireWorkspaceRole("manager");
  return getAiSettings(workspaceId);
}

export async function setAiSettingsAction(settings: Partial<AiSettings>) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  try {
    await setAiSettings(workspaceId, settings);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ذخیره" };
  }
}
