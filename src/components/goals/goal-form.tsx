"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createGoalAction } from "@/actions/goals";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = { id: string; name: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onSaved: () => void;
};

export function GoalFormDialog({ open, onOpenChange, members, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [targetAmount, setTargetAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function reset() {
    setUserId("");
    setPeriod("monthly");
    setTargetAmount("");
    setStartDate("");
    setEndDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await createGoalAction({
      userId,
      period: period as "monthly" | "quarterly" | "yearly",
      targetAmount: Number(targetAmount),
      startDate,
      endDate,
    });

    setSaving(false);

    if (!result.ok) {
      toast.error("خطا در ایجاد هدف");
      return;
    }

    toast.success("هدف جدید ایجاد شد");
    reset();
    onSaved();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>هدف فروش جدید</DialogTitle>
          <DialogDescription>
            اطلاعات هدف فروش را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>کاربر *</Label>
            <Select value={userId} onValueChange={setUserId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="انتخاب کاربر" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>دوره *</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">ماهانه</SelectItem>
                <SelectItem value="quarterly">فصلی</SelectItem>
                <SelectItem value="yearly">سالانه</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="goal-target">مبلغ هدف (تومان) *</Label>
            <Input
              id="goal-target"
              type="number"
              dir="rtl"
              required
              min={0}
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="مثلاً ۱۰۰,۰۰۰,۰۰۰"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-start">تاریخ شروع *</Label>
              <Input
                id="goal-start"
                type="date"
                dir="rtl"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-end">تاریخ پایان *</Label>
              <Input
                id="goal-end"
                type="date"
                dir="rtl"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
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
              ایجاد هدف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
