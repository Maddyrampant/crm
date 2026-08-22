"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { JalaliDateInput } from "@/components/ui/jalali-date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDealAction, updateDealAction } from "@/actions/deals";
import { NotesPanel } from "@/components/notes/notes-panel";
import { formatNumber } from "@/lib/format";
import type { DealRow, PipelineRow } from "@/lib/api-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: PipelineRow[];
  contacts: { id: string; name: string }[];
  members: { id: string; name: string; email: string }[];
  deal?: DealRow | null;
  defaultPipelineId?: string;
  defaultStageId?: string;
  onSaved: (deal: DealRow) => void;
};

export function DealFormDialog({
  open,
  onOpenChange,
  pipelines,
  contacts,
  members,
  deal,
  defaultPipelineId,
  defaultStageId,
  onSaved,
}: Props) {
  const initialPipelineId =
    deal?.pipelineId || defaultPipelineId || pipelines[0]?.id || "";

  const stagesForPipeline =
    pipelines.find((p) => p.id === initialPipelineId)?.stages ?? [];
  const initialStageId =
    deal?.stageId || defaultStageId || stagesForPipeline[0]?.id || "";

  const [saving, setSaving] = useState(false);
  const [pipelineId, setPipelineId] = useState(initialPipelineId);
  const [stageId, setStageId] = useState(initialStageId);
  const [title, setTitle] = useState(deal?.title ?? "");
  const [amount, setAmount] = useState(deal ? String(deal.amount) : "");
  const [contactId, setContactId] = useState(deal?.contactId ?? "");
  const [ownerId, setOwnerId] = useState(deal?.ownerId ?? "");
  const [closeDate, setCloseDate] = useState(deal?.closeDate?.slice(0, 10) ?? "");

  const stages = pipelines.find((p) => p.id === pipelineId)?.stages ?? [];

  function handlePipelineChange(value: string) {
    setPipelineId(value);
    const nextStages = pipelines.find((p) => p.id === value)?.stages ?? [];
    setStageId(nextStages[0]?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title,
      amount: Number(amount) || 0,
      pipelineId,
      stageId,
      contactId: contactId || null,
      ownerId: ownerId || null,
      closeDate: closeDate || null,
    };

    const result = deal
      ? await updateDealAction(deal.id, payload)
      : await createDealAction(payload);

    setSaving(false);
    if (!result.ok || !result.data) {
      toast.error(result.error ?? "خطا در ثبت فروش");
      return;
    }

    toast.success(deal ? "فروش ویرایش شد" : "فروش جدید ساخته شد");
    onSaved(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal ? "ویرایش فروش" : "فروش جدید"}</DialogTitle>
          <DialogDescription>اطلاعات فرصت فروش را وارد کنید.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">عنوان *</Label>
              <Input
                id="title"
                required
                placeholder="مثلاً: قرارداد پشتیبانی سالانه"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="amount">مبلغ (تومان)</Label>
                <Input
                  id="amount"
                  dir="ltr"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {amount && <p className="text-xs text-muted-foreground">{formatNumber(amount)}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closeDate">تاریخ بسته‌شدن</Label>
                <JalaliDateInput value={closeDate} onChange={(v) => setCloseDate(v ?? "")} id="closeDate" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>فانل فروش</Label>
                <Select value={pipelineId} onValueChange={handlePipelineChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>مرحله</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>مشتری</Label>
                <Select value={contactId || "none"} onValueChange={(v) => setContactId(v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب مشتری" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مشتری</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>مسئول فروش</Label>
                <Select value={ownerId || "none"} onValueChange={(v) => setOwnerId(v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب مسئول" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مسئول</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          {deal && open && (
            <div className="grid gap-2 border-t pt-4">
              <NotesPanel entityType="deal" entityId={deal.id} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {deal ? "ذخیره تغییرات" : "ایجاد فروش"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
