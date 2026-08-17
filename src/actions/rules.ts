"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  createRule,
  deleteRule,
  getRule,
  listRuleLogs,
  listRules,
  setRuleActive,
  testRule,
  updateRule,
} from "@/services/rules";
import type { RuleInput } from "@/lib/rules";

export async function getRulesAction(params?: { page?: number; pageSize?: number; search?: string; event?: string }) {
  const { workspaceId } = await requireWorkspace();
  return listRules(workspaceId, params);
}

export async function getRuleAction(ruleId: string) {
  const { workspaceId } = await requireWorkspace();
  return getRule(workspaceId, ruleId);
}

export async function createRuleAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  try {
    const row = await createRule(workspaceId, raw);
    revalidatePath("/settings");
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ایجاد قانون" };
  }
}

export async function updateRuleAction(ruleId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  try {
    const row = await updateRule(workspaceId, ruleId, raw);
    revalidatePath("/settings");
    return { ok: Boolean(row), error: row ? undefined : "قانون یافت نشد" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ویرایش قانون" };
  }
}

export async function toggleRuleAction(ruleId: string, active: boolean) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await setRuleActive(workspaceId, ruleId, active);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function deleteRuleAction(ruleId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteRule(workspaceId, ruleId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function getRuleLogsAction(params?: { page?: number; pageSize?: number }) {
  const { workspaceId } = await requireWorkspace();
  return listRuleLogs(workspaceId, params);
}

export async function testRuleAction(input: RuleInput, payload: Record<string, unknown>) {
  const { workspaceId } = await requireWorkspace();
  return testRule(workspaceId, input, payload);
}
