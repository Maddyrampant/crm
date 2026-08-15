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
import { Label } from "@/components/ui/label";
import { createPipelineAction, createStageAction } from "@/actions/pipelines";

const STAGE_COLORS = [
  "#7367f0",
  "#28c76f",
  "#ff9f43",
  "#00bad1",
  "#ff4c51",
  "#808390",
];

export function NewPipelineDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createPipelineAction({ name });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("فانل فروش ساخته شد");
    onCreated();
    setName("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>فانل فروش جدید</DialogTitle>
          <DialogDescription>نام فانل را وارد کنید؛ مرحله‌ها را می‌توانید اضافه کنید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pipelineName">نام فانل</Label>
            <Input
              id="pipelineName"
              required
              autoFocus
              placeholder="مثلاً: فروش سالانه"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              ایجاد
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewStageDialog({
  open,
  onOpenChange,
  pipelineId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(STAGE_COLORS[0]);
  const [winProbability, setWinProbability] = useState("0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createStageAction(pipelineId, {
      name,
      color,
      winProbability: Number(winProbability) || 0,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("مرحله اضافه شد");
    setName("");
    setWinProbability("0");
    onCreated();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>مرحله جدید</DialogTitle>
          <DialogDescription>یک مرحله به فانل اضافه کنید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="stageName">نام مرحله</Label>
            <Input
              id="stageName"
              required
              autoFocus
              placeholder="مثلاً: مذاکره"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>رنگ</Label>
            <div className="flex flex-wrap gap-2">
              {STAGE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`color ${c}`}
                  className="size-6 rounded-full ring-offset-2 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px var(--background), 0 0 0 4px ${c}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="winProbability">احتمال موفقیت (٪)</Label>
            <Input
              id="winProbability"
              dir="ltr"
              type="number"
              min={0}
              max={100}
              value={winProbability}
              onChange={(e) => setWinProbability(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              افزودن
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
