export const RULE_ACTION_TYPES = [
  "email",
  "task",
  "notification",
  "sms",
  "move_deal",
] as const;

export const CONDITION_OPS = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "is_set",
] as const;

export const RULE_EVENTS = [
  {
    key: "deal.stage_changed",
    label: "تغییر مرحله فرصت فروش",
    fields: ["stageId", "fromStageId", "pipelineId", "amount", "status", "contactId", "ownerId"],
  },
  {
    key: "deal.outcome_changed",
    label: "ثبت برد یا باخت فرصت",
    fields: ["status", "amount", "stageId", "contactId", "ownerId"],
  },
  {
    key: "contact.created",
    label: "ایجاد مشتری جدید",
    fields: ["source", "lifecycleStage", "email", "phone", "companyId", "ownerId"],
  },
  {
    key: "invoice.created",
    label: "ایجاد فاکتور جدید",
    fields: ["status", "total", "contactId"],
  },
  {
    key: "invoice.payment_received",
    label: "دریافت پرداخت",
    fields: ["amount", "total", "status", "contactId"],
  },
  {
    key: "invoice.overdue",
    label: "سررسید شدن فاکتور",
    fields: ["number", "total", "contactId"],
  },
  {
    key: "appointment.created",
    label: "ثبت قرار ملاقات",
    fields: ["type", "title", "contactId", "userId"],
  },
] as const;

export type RuleEventKey = (typeof RULE_EVENTS)[number]["key"];

export type RuleConditionOp = (typeof CONDITION_OPS)[number];

export type RuleCondition = {
  field: string;
  op: RuleConditionOp;
  value?: string | number;
};

export type RuleEmailAction = {
  type: "email";
  to: "contact" | "owner";
  subject: string;
  body: string;
};

export type RuleTaskAction = {
  type: "task";
  title: string;
  description?: string;
  assignee: "owner" | "none";
  priority: "low" | "medium" | "high";
  dueOffsetDays?: number;
  remindOffsetDays?: number;
};

export type RuleNotificationAction = {
  type: "notification";
  title: string;
  body?: string;
  target: "workspace" | "owner";
};

export type RuleSmsAction = {
  type: "sms";
  to: "contact" | "owner";
  body: string;
};

export type RuleMoveDealAction = {
  type: "move_deal";
  stageId: string;
};

export type RuleAction =
  | RuleEmailAction
  | RuleTaskAction
  | RuleNotificationAction
  | RuleSmsAction
  | RuleMoveDealAction;

export type RuleInput = {
  name: string;
  description?: string;
  event: RuleEventKey;
  conditions: RuleCondition[];
  actions: RuleAction[];
  active?: boolean;
};

export type RuleValidationResult = {
  ok: boolean;
  errors: string[];
};

const EVENT_FIELDS = new Map<string, Set<string>>(
  RULE_EVENTS.map((e) => [e.key, new Set(e.fields)])
);

export function validateRuleInput(raw: unknown): RuleValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["ورودی نامعتبر است"] };
  }
  const input = raw as Partial<RuleInput>;

  if (!input.name || !String(input.name).trim()) {
    errors.push("نام قانون الزامی است");
  }

  const event = input.event as RuleEventKey;
  const eventMeta = RULE_EVENTS.find((e) => e.key === event);
  if (!eventMeta) {
    errors.push("رویداد نامعتبر است");
  }

  if (!Array.isArray(input.conditions)) {
    errors.push("شرایط باید آرایه باشد");
  } else if (eventMeta) {
    const fields = EVENT_FIELDS.get(eventMeta.key)!;
    for (const [i, c] of input.conditions.entries()) {
      if (!c || typeof c !== "object") {
        errors.push(`شرط ${i + 1} نامعتبر است`);
        continue;
      }
      if (!c.field || !fields.has(c.field)) {
        errors.push(`شرط ${i + 1}: فیلد «${String(c.field ?? "")}» برای این رویداد مجاز نیست`);
      }
      if (!CONDITION_OPS.includes(c.op)) {
        errors.push(`شرط ${i + 1}: عملگر نامعتبر است`);
      }
      if (c.op !== "is_set" && c.value === undefined) {
        errors.push(`شرط ${i + 1}: مقدار الزامی است`);
      }
    }
  }

  if (!Array.isArray(input.actions) || input.actions.length === 0) {
    errors.push("حداقل یک اکشن الزامی است");
  } else {
    for (const [i, a] of input.actions.entries()) {
      if (!a || typeof a !== "object") {
        errors.push(`اکشن ${i + 1} نامعتبر است`);
        continue;
      }
      const action = a as Record<string, unknown>;
      if (!RULE_ACTION_TYPES.includes(action.type as never)) {
        errors.push(`اکشن ${i + 1}: نوع نامعتبر است`);
        continue;
      }
      switch (action.type) {
        case "email":
          if (!String(action.subject ?? "").trim()) errors.push(`اکشن ${i + 1}: موضوع ایمیل الزامی است`);
          if (!String(action.body ?? "").trim()) errors.push(`اکشن ${i + 1}: متن ایمیل الزامی است`);
          if (!["contact", "owner"].includes(String(action.to))) {
            errors.push(`اکشن ${i + 1}: گیرنده ایمیل نامعتبر است`);
          }
          break;
        case "task":
          if (!String(action.title ?? "").trim()) errors.push(`اکشن ${i + 1}: عنوان تسک الزامی است`);
          if (!["low", "medium", "high"].includes(String(action.priority))) {
            errors.push(`اکشن ${i + 1}: اولویت نامعتبر است`);
          }
          break;
        case "notification":
          if (!String(action.title ?? "").trim()) errors.push(`اکشن ${i + 1}: عنوان اعلان الزامی است`);
          break;
        case "sms":
          if (!String(action.body ?? "").trim()) errors.push(`اکشن ${i + 1}: متن پیامک الزامی است`);
          break;
        case "move_deal":
          if (!String(action.stageId ?? "").trim()) errors.push(`اکشن ${i + 1}: مرحله مقصد الزامی است`);
          break;
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function formatRuleConditionValue(cond: RuleCondition): string {
  if (cond.op === "is_set") return "تنظیم شده";
  return String(cond.value ?? "");
}
