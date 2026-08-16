import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  contacts,
  deals,
  reminders,
  ruleLogs,
  rules,
  tasks,
  user,
  type Rule,
} from "@/db/schema";
import { validateRuleInput, type RuleAction, type RuleCondition, type RuleInput } from "@/lib/rules";
import { dispatchWebhookEvent, renderTemplate, sendEmail, sendSms } from "./automation";
import { createNotification, notifyWorkspace } from "./notifications";

type RulePayload = Record<string, unknown>;

function flattenPayload(payload: RulePayload): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    out[k] = v as string | number;
  }
  return out;
}

function evaluateConditions(
  conditions: RuleCondition[],
  ctx: Record<string, string | number>
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((cond) => {
    const actual = ctx[cond.field];
    if (cond.op === "is_set") {
      return actual !== undefined && actual !== null && actual !== "";
    }
    if (cond.op === "contains") {
      return String(actual ?? "").includes(String(cond.value ?? ""));
    }
    if (actual === undefined || actual === null) return false;
    const a = Number(actual);
    const b = Number(cond.value);
    switch (cond.op) {
      case "eq":
        return String(actual) === String(cond.value);
      case "ne":
        return String(actual) !== String(cond.value);
      case "gt":
        return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
      case "gte":
        return !Number.isNaN(a) && !Number.isNaN(b) && a >= b;
      case "lt":
        return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
      case "lte":
        return !Number.isNaN(a) && !Number.isNaN(b) && a <= b;
      default:
        return false;
    }
  });
}

/** انتقال مستقیم دیل (بدون راه‌اندازی دوباره قوانین — جلوگیری از حلقه). */
async function moveDealBypass(workspaceId: string, dealId: string, stageId: string) {
  const [deal] = await db
    .select({ id: deals.id, pipelineId: deals.pipelineId, stageId: deals.stageId })
    .from(deals)
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, dealId)))
    .limit(1);
  if (!deal || deal.stageId === stageId) return null;
  const [updated] = await db
    .update(deals)
    .set({ stageId, updatedAt: new Date() })
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, dealId)))
    .returning({ id: deals.id, stageId: deals.stageId });
  if (updated) {
    dispatchWebhookEvent(workspaceId, "deal.stage_changed", {
      id: deal.id,
      pipelineId: deal.pipelineId,
      stageId: updated.stageId,
    });
  }
  return updated ?? null;
}

async function executeActions(
  workspaceId: string,
  rule: Rule,
  payload: RulePayload
): Promise<{ executed: number; error: string | null }> {
  let executed = 0;
  let error: string | null = null;

  const ctx = flattenPayload(payload);
  const contactRow = payload.contactId
    ? ((await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, String(payload.contactId)))
        .limit(1))[0] ?? null)
    : null;

  if (contactRow) {
    ctx["contact.firstName"] = contactRow.firstName;
    ctx["contact.lastName"] = contactRow.lastName ?? "";
    ctx["contact.email"] = contactRow.email ?? "";
    ctx["contact.phone"] = contactRow.phone ?? "";
  }

  const ownerId = (payload.ownerId ?? payload.userId ?? contactRow?.ownerId) as
    | string
    | null
    | undefined;
  let ownerEmail: string | null = null;
  if (ownerId) {
    const [u] = await db.select().from(user).where(eq(user.id, ownerId)).limit(1);
    ownerEmail = u?.email ?? null;
    if (u) ctx["owner.email"] = u.email;
  }

  const link = payload.link ? String(payload.link) : null;

  for (const action of rule.actions as RuleAction[]) {
    try {
      switch (action.type) {
        case "notification": {
          const title = renderTemplate(action.title, ctx);
          const body = action.body ? renderTemplate(action.body, ctx) : undefined;
          if (action.target === "owner" && ownerId) {
            await createNotification({
              workspaceId,
              userId: ownerId,
              type: "system",
              title,
              body,
              link,
              data: { ruleId: rule.id },
            });
          } else {
            await notifyWorkspace({
              workspaceId,
              type: "system",
              title,
              body,
              link,
              data: { ruleId: rule.id },
            });
          }
          break;
        }
        case "email": {
          let to = "";
          if (action.to === "contact" && contactRow?.email) to = contactRow.email;
          else if (action.to === "owner" && ownerEmail) to = ownerEmail;
          if (to) {
            await sendEmail(workspaceId, {
              to,
              subject: renderTemplate(action.subject, ctx),
              body: renderTemplate(action.body, ctx),
              contactId: contactRow?.id ?? undefined,
            });
          }
          break;
        }
        case "sms": {
          let to = "";
          if (action.to === "contact" && contactRow?.phone) to = contactRow.phone;
          else if (action.to === "owner" && ownerEmail) to = ownerEmail;
          if (to) {
            await sendSms(workspaceId, {
              to,
              body: renderTemplate(action.body, ctx),
              contactId: contactRow?.id ?? undefined,
            });
          }
          break;
        }
        case "task": {
          const dueAt = action.dueOffsetDays
            ? new Date(Date.now() + action.dueOffsetDays * 86_400_000)
            : null;
          const [task] = await db
            .insert(tasks)
            .values({
              workspaceId,
              contactId: contactRow?.id ?? null,
              userId: action.assignee === "owner" ? (ownerId ?? null) : null,
              title: renderTemplate(action.title, ctx),
              description: action.description
                ? renderTemplate(action.description, ctx)
                : null,
              dueAt,
              priority: action.priority,
            })
            .returning({ id: tasks.id });
          if (task && action.remindOffsetDays && action.remindOffsetDays > 0) {
            await db.insert(reminders).values({
              workspaceId,
              taskId: task.id,
              remindAt: new Date(Date.now() + action.remindOffsetDays * 86_400_000),
              channel: "in_app",
            });
          }
          break;
        }
        case "move_deal": {
          if (payload.dealId) {
            await moveDealBypass(workspaceId, String(payload.dealId), action.stageId);
          }
          break;
        }
      }
      executed++;
    } catch (err) {
      if (!error) error = err instanceof Error ? err.message : "unknown error";
    }
  }
  return { executed, error };
}

/** راه‌اندازی ارزیابی قوانین برای یک رویداد (fire-and-forget). */
export function dispatchRuleEvent(workspaceId: string, event: string, payload: RulePayload) {
  void (async () => {
    try {
      const activeRules = await db
        .select()
        .from(rules)
        .where(and(eq(rules.workspaceId, workspaceId), eq(rules.event, event as never), eq(rules.active, true)));
      for (const rule of activeRules) {
        try {
          const ctx = flattenPayload(payload);
          const matched = evaluateConditions(rule.conditions, ctx);
          if (!matched) {
            await db.insert(ruleLogs).values({
              workspaceId,
              ruleId: rule.id,
              event,
              entityId: payload.entityId ? String(payload.entityId) : null,
              matched: false,
              actionsExecuted: 0,
            });
            continue;
          }
          const { executed, error } = await executeActions(workspaceId, rule, payload);
          await db.insert(ruleLogs).values({
            workspaceId,
            ruleId: rule.id,
            event,
            entityId: payload.entityId ? String(payload.entityId) : null,
            matched: true,
            actionsExecuted: executed,
            error,
          });
        } catch (err) {
          await db.insert(ruleLogs).values({
            workspaceId,
            ruleId: rule.id,
            event,
            entityId: payload.entityId ? String(payload.entityId) : null,
            matched: false,
            actionsExecuted: 0,
            error: err instanceof Error ? err.message : "unknown error",
          });
        }
      }
    } catch {
      // تبلیغات silence — خطای موتور نباید جریان اصلی را بشکند
    }
  })();
}

/* ─────────────────── CRUD ─────────────────── */

export async function listRules(workspaceId: string) {
  return db
    .select()
    .from(rules)
    .where(eq(rules.workspaceId, workspaceId))
    .orderBy(desc(rules.createdAt));
}

export async function getRule(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(rules)
    .where(and(eq(rules.id, id), eq(rules.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

export async function createRule(workspaceId: string, raw: unknown) {
  const validation = validateRuleInput(raw);
  if (!validation.ok) {
    throw new Error(validation.errors.join("؛ "));
  }
  const input = raw as RuleInput;
  const [row] = await db
    .insert(rules)
    .values({
      workspaceId,
      name: input.name,
      description: input.description ?? null,
      event: input.event,
      conditions: input.conditions ?? [],
      actions: input.actions,
      active: input.active ?? true,
    })
    .returning();
  return row;
}

export async function updateRule(workspaceId: string, id: string, raw: unknown) {
  const [existing] = await db
    .select()
    .from(rules)
    .where(and(eq(rules.id, id), eq(rules.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) return null;

  const merged = { ...existing, ...(raw as Partial<RuleInput>) };
  const validation = validateRuleInput(merged);
  if (!validation.ok) {
    throw new Error(validation.errors.join("؛ "));
  }
  const input = merged as RuleInput;
  const [row] = await db
    .update(rules)
    .set({
      name: input.name,
      description: input.description ?? null,
      event: input.event,
      conditions: input.conditions ?? [],
      actions: input.actions,
      updatedAt: new Date(),
    })
    .where(and(eq(rules.id, id), eq(rules.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function setRuleActive(workspaceId: string, id: string, active: boolean) {
  const [row] = await db
    .update(rules)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(rules.id, id), eq(rules.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteRule(workspaceId: string, id: string) {
  const [row] = await db
    .delete(rules)
    .where(and(eq(rules.id, id), eq(rules.workspaceId, workspaceId)))
    .returning({ id: rules.id });
  return row ?? null;
}

export async function listRuleLogs(workspaceId: string, limit = 25) {
  return db
    .select()
    .from(ruleLogs)
    .where(eq(ruleLogs.workspaceId, workspaceId))
    .orderBy(desc(ruleLogs.createdAt))
    .limit(limit);
}

/** پیش‌نمایش خشک — ارزیابی شرط‌ها بدون اجرای اکشن‌ها. */
export async function testRule(
  workspaceId: string,
  input: RuleInput,
  payload: RulePayload
): Promise<{ ok: boolean; matched: boolean; message: string }> {
  void workspaceId;
  const validation = validateRuleInput(input);
  if (!validation.ok) {
    return { ok: false, matched: false, message: validation.errors.join("؛ ") };
  }
  const matched = evaluateConditions(input.conditions ?? [], flattenPayload(payload));
  return {
    ok: true,
    matched,
    message: matched
      ? "شرایط برقرار است — اکشن‌ها اجرا خواهند شد."
      : "شرایط برقرار نیست — اکشن‌ها اجرا نمی‌شوند.",
  };
}
