"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONDITION_OPS,
  RULE_ACTION_TYPES,
  RULE_EVENTS,
  validateRuleInput,
  type RuleAction,
  type RuleCondition,
  type RuleConditionOp,
  type RuleEventKey,
  type RuleInput,
} from "@/lib/rules";
import { createRuleAction, updateRuleAction } from "@/actions/rules";
import type { Rule } from "@/db/schema";
import { ACTION_LABELS } from "@/components/rules/labels";

export type StageOption = { id: string; name: string; pipelineName: string };

const FIELD_LABELS: Record<string, string> = {
  stageId: "مرحله",
  fromStageId: "مرحله قبلی",
  pipelineId: "فانل فروش",
  amount: "مبلغ",
  status: "وضعیت",
  contactId: "مشتری",
  ownerId: "مسئول",
  source: "منبع",
  lifecycleStage: "مرحله چرخه زندگی",
  email: "ایمیل",
  phone: "تلفن",
  companyId: "شرکت",
  number: "شماره",
  total: "جمع کل",
  type: "نوع",
  title: "عنوان",
  userId: "کاربر",
};

const OP_LABELS: Record<string, string> = {
  eq: "برابر",
  ne: "نابرابر",
  gt: "بزرگ‌تر از",
  gte: "بزرگ‌تر یا مساوی",
  lt: "کوچک‌تر از",
  lte: "کوچک‌تر یا مساوی",
  contains: "شامل",
  is_set: "مقدار دارد",
};

const TO_LABELS: Record<string, string> = {
  contact: "مشتری (تماس)",
  owner: "مسئول فروش",
};

const ASSIGNEE_LABELS: Record<string, string> = {
  owner: "مسئول فروش",
  none: "بدون مسئول",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

const TARGET_LABELS: Record<string, string> = {
  workspace: "کل فضای کاری",
  owner: "مسئول فروش",
};

type ActionDraft = {
  type: RuleAction["type"];
  to?: "contact" | "owner";
  subject?: string;
  body?: string;
  title?: string;
  description?: string;
  assignee?: "owner" | "none";
  priority?: "low" | "medium" | "high";
  dueOffsetDays?: number;
  remindOffsetDays?: number;
  target?: "workspace" | "owner";
  stageId?: string;
};

function actionToDraft(a: RuleAction): ActionDraft {
  return { ...a };
}

function toRuleAction(d: ActionDraft): RuleAction {
  switch (d.type) {
    case "email":
      return {
        type: "email",
        to: d.to ?? "owner",
        subject: d.subject ?? "",
        body: d.body ?? "",
      };
    case "task":
      return {
        type: "task",
        title: d.title ?? "",
        description: d.description || undefined,
        assignee: d.assignee ?? "owner",
        priority: d.priority ?? "medium",
        dueOffsetDays: d.dueOffsetDays,
        remindOffsetDays: d.remindOffsetDays,
      };
    case "notification":
      return {
        type: "notification",
        title: d.title ?? "",
        body: d.body || undefined,
        target: d.target ?? "workspace",
      };
    case "sms":
      return { type: "sms", to: d.to ?? "owner", body: d.body ?? "" };
    case "move_deal":
      return { type: "move_deal", stageId: d.stageId ?? "" };
  }
}

const NUMERIC_OPS: RuleConditionOp[] = ["gt", "gte", "lt", "lte"];

type ConditionDraft = { field: string; op: string; value: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: Rule | null;
  stages: StageOption[];
  onSaved?: () => void;
};

export function RuleFormDialog({
  open,
  onOpenChange,
  rule,
  stages,
  onSaved,
}: Props) {
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [event, setEvent] = useState<RuleEventKey>(
    rule?.event ?? RULE_EVENTS[0].key
  );
  const [conditions, setConditions] = useState<ConditionDraft[]>(() =>
    (rule?.conditions ?? []).map((c) => ({
      field: c.field,
      op: c.op,
      value: c.value === undefined ? "" : String(c.value),
    }))
  );
  const [actions, setActions] = useState<ActionDraft[]>(() =>
    (rule?.actions ?? []).map(actionToDraft)
  );
  const [saving, setSaving] = useState(false);
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  const eventMeta = useMemo(
    () => RULE_EVENTS.find((e) => e.key === event),
    [event]
  );
  const fields = eventMeta?.fields ?? [];

  function changeEvent(key: RuleEventKey) {
    setEvent(key);
    setConditions([]);
  }

  function updateCondition(index: number, patch: Partial<ConditionDraft>) {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }

  function updateAction(index: number, patch: Partial<ActionDraft>) {
    setActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch } : a))
    );
  }

  async function handleSave() {
    if (saving) return;
    const conditionsInput: RuleCondition[] = conditions.map((c) => {
      const base: RuleCondition = { field: c.field, op: c.op as RuleConditionOp };
      if (c.op === "is_set") return base;
      const raw = c.value.trim();
      if (NUMERIC_OPS.includes(c.op as RuleConditionOp) && raw !== "" && !Number.isNaN(Number(raw))) {
        return { ...base, value: Number(raw) };
      }
      return { ...base, value: raw };
    });

    const input: RuleInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      event,
      conditions: conditionsInput,
      actions: actions.map(toRuleAction),
      active: rule?.active ?? true,
    };

    const validation = validateRuleInput(input);
    if (!validation.ok) {
      setLocalErrors(validation.errors);
      return;
    }

    setSaving(true);
    const result = rule
      ? await updateRuleAction(rule.id, input)
      : await createRuleAction(input);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error ?? "خطا در ذخیرهٔ قانون");
      return;
    }
    toast.success(rule ? "قانون ویرایش شد" : "قانون ساخته شد");
    onOpenChange(false);
    onSaved?.();
  }

  const fieldSelect = (value: string, onValueChange: (v: string) => void) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {fields.map((f) => (
          <SelectItem key={f} value={f}>
            {FIELD_LABELS[f] ?? f}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const opSelect = (value: string, onValueChange: (v: string) => void) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONDITION_OPS.map((op) => (
          <SelectItem key={op} value={op}>
            {OP_LABELS[op] ?? op}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? "ویرایش قانون" : "قانون جدید"}</DialogTitle>
          <DialogDescription>
            انتخاب رویداد → افزودن شرایط → افزودن اکشن‌ها. اجرا خودکار و بدونِ بستن
            جریان اصلی است.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">نام قانون</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: یادآوری پیگیری فروش بالا"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">رویداد</Label>
                <Select
                  value={event}
                  onValueChange={(v) => changeEvent(v as RuleEventKey)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_EVENTS.map((e) => (
                      <SelectItem key={e.key} value={e.key}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                توضیحات (اختیاری)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کوتاه دربارهٔ این قانون"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  شرایط (همه باید برقرار باشند)
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConditions((prev) => [...prev, { field: fields[0] ?? "", op: "eq", value: "" }])}
                  disabled={fields.length === 0}
                >
                  <Plus className="size-3.5" />
                  افزودن شرط
                </Button>
              </div>
              {conditions.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  بدون شرط — قانون روی همهٔ رویدادها اجرا می‌شود.
                </p>
              ) : (
                <ul className="space-y-2">
                  {conditions.map((c, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-md border p-2"
                    >
                      {fieldSelect(c.field, (v) => updateCondition(i, { field: v }))}
                      {opSelect(c.op, (v) => updateCondition(i, { op: v }))}
                      {c.op !== "is_set" ? (
                        <Input
                          className="w-40"
                          value={c.value}
                          onChange={(e) => updateCondition(i, { value: e.target.value })}
                          placeholder="مقدار"
                        />
                      ) : null}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          setConditions((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">
                اکشن‌ها (حداقل یک)
              </Label>
              <ul className="space-y-3">
                {actions.map((a, i) => (
                  <li key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Select
                        value={a.type}
                        onValueChange={(v) =>
                          updateAction(i, {
                            type: v as RuleAction["type"],
                            to: undefined,
                            subject: undefined,
                            body: undefined,
                            title: undefined,
                            description: undefined,
                            assignee: undefined,
                            priority: undefined,
                            dueOffsetDays: undefined,
                            remindOffsetDays: undefined,
                            target: undefined,
                            stageId: undefined,
                          })
                        }
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_ACTION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {ACTION_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          setActions((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {a.type === "email" && (
                        <>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">گیرنده</Label>
                            <Select
                              value={a.to ?? "owner"}
                              onValueChange={(v) => updateAction(i, { to: v as "contact" | "owner" })}
                            >
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(TO_LABELS).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1.5 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">موضوع</Label>
                            <Input
                              value={a.subject ?? ""}
                              onChange={(e) => updateAction(i, { subject: e.target.value })}
                              placeholder="موضوع ایمیل"
                            />
                          </div>
                          <div className="grid gap-1.5 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">متن</Label>
                            <Textarea
                              value={a.body ?? ""}
                              onChange={(e) => updateAction(i, { body: e.target.value })}
                              placeholder="متن ایمیل — متغیرها: {{contact.firstName}}، {{contact.email}}، {{owner.email}}، {{total}}"
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      {a.type === "task" && (
                        <>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">عنوان تسک</Label>
                            <Input
                              value={a.title ?? ""}
                              onChange={(e) => updateAction(i, { title: e.target.value })}
                              placeholder="عنوان تسک"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">اولویت</Label>
                            <Select
                              value={a.priority ?? "medium"}
                              onValueChange={(v) => updateAction(i, { priority: v as "low" | "medium" | "high" })}
                            >
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(PRIORITY_LABELS).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">مسئول</Label>
                            <Select
                              value={a.assignee ?? "owner"}
                              onValueChange={(v) => updateAction(i, { assignee: v as "owner" | "none" })}
                            >
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(ASSIGNEE_LABELS).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">توضیحات</Label>
                            <Input
                              value={a.description ?? ""}
                              onChange={(e) => updateAction(i, { description: e.target.value })}
                              placeholder="توضیحات تسک (متغیرها مجازند)"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">
                              سررسید (روز از اکنون، اختیاری)
                            </Label>
                            <Input
                              type="number"
                              dir="ltr"
                              value={a.dueOffsetDays ?? ""}
                              onChange={(e) =>
                                updateAction(i, {
                                  dueOffsetDays: e.target.value === "" ? undefined : Number(e.target.value),
                                })
                              }
                              placeholder="مثلاً ۲"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">
                              یادآور (روز قبل، اختیاری)
                            </Label>
                            <Input
                              type="number"
                              dir="ltr"
                              value={a.remindOffsetDays ?? ""}
                              onChange={(e) =>
                                updateAction(i, {
                                  remindOffsetDays: e.target.value === "" ? undefined : Number(e.target.value),
                                })
                              }
                              placeholder="مثلاً ۱"
                            />
                          </div>
                        </>
                      )}

                      {a.type === "notification" && (
                        <>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">عنوان اعلان</Label>
                            <Input
                              value={a.title ?? ""}
                              onChange={(e) => updateAction(i, { title: e.target.value })}
                              placeholder="عنوان اعلان"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">مخاطب</Label>
                            <Select
                              value={a.target ?? "workspace"}
                              onValueChange={(v) => updateAction(i, { target: v as "workspace" | "owner" })}
                            >
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(TARGET_LABELS).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1.5 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">متن</Label>
                            <Textarea
                              value={a.body ?? ""}
                              onChange={(e) => updateAction(i, { body: e.target.value })}
                              placeholder="متن اعلان (متغیرها مجازند)"
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      {a.type === "sms" && (
                        <>
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">گیرنده</Label>
                            <Select
                              value={a.to ?? "owner"}
                              onValueChange={(v) => updateAction(i, { to: v as "contact" | "owner" })}
                            >
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(TO_LABELS).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1.5 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">متن پیامک</Label>
                            <Textarea
                              value={a.body ?? ""}
                              onChange={(e) => updateAction(i, { body: e.target.value })}
                              placeholder="متن پیامک — متغیرها: {{contact.firstName}}، {{total}}"
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      {a.type === "move_deal" && (
                        <div className="grid gap-1.5 sm:col-span-2">
                          <Label className="text-xs text-muted-foreground">مرحلهٔ مقصد</Label>
                          <Select
                            value={a.stageId ?? ""}
                            onValueChange={(v) => updateAction(i, { stageId: v })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="انتخاب مرحله" />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.pipelineName} ← {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setActions((prev) => [...prev, { type: "email" }])
                }
              >
                <Plus className="size-3.5" />
                افزودن اکشن
              </Button>
            </div>

            {localErrors.length > 0 && (
              <ul className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {localErrors.map((err) => (
                  <li key={err}>• {err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : rule ? (
              "ذخیرهٔ تغییرات"
            ) : (
              "ساخت قانون"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
