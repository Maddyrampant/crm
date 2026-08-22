"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { createGoalAction } from "@/actions/goals";

type Props = {
  onCreated: () => void;
};

export function GoalForm({ onCreated }: Props) {
  const [pending, startTransition] = useTransition();
  const [period, setPeriod] = useState("monthly");
  const [targetAmount, setTargetAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetAmount || !startDate || !endDate) {
      toast.error("همه فیلدها را پر کنید");
      return;
    }
    startTransition(async () => {
      const res = await createGoalAction({
        userId: "",
        period,
        targetAmount: Number(targetAmount),
        startDate,
        endDate,
      });
      if (res.ok) {
        toast.success("هدف ایجاد شد");
        setTargetAmount("");
        setStartDate("");
        setEndDate("");
        onCreated();
      } else {
        toast.error("خطا در ایجاد هدف");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">هدف جدید</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>دوره</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">ماهانه</SelectItem>
              <SelectItem value="quarterly">فصلی</SelectItem>
              <SelectItem value="yearly">سالانه</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>مبلغ هدف (تومان)</Label>
          <Input
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="50000000"
          />
        </div>
        <div className="space-y-2">
          <Label>تاریخ شروع</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>تاریخ پایان</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "در حال ایجاد..." : "ایجاد هدف"}
      </Button>
    </form>
  );
}

type GoalFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: { id: string; name: string | null }[];
  onSaved: () => void;
};

export function GoalFormDialog({ open, onOpenChange, onSaved }: GoalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>هدف جدید</DialogTitle>
        </DialogHeader>
        <GoalForm onCreated={onSaved} />
      </DialogContent>
    </Dialog>
  );
}
