"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSlaPolicyAction } from "@/actions/sla-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function SlaPolicyFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("deal");
  const [responseTimeHours, setResponseTimeHours] = useState("24");
  const [resolutionTimeHours, setResolutionTimeHours] = useState("72");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSlaPolicyAction({
        name,
        entityType,
        responseTimeHours: parseInt(responseTimeHours),
        resolutionTimeHours: parseInt(resolutionTimeHours),
      });
      if (result.ok) {
        toast.success("سیاست SLA ایجاد شد");
        setName("");
        setResponseTimeHours("24");
        setResolutionTimeHours("72");
        onSaved();
      } else {
        toast.error("خطا در ایجاد");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>سیاست SLA جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نام</Label>
            <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>زمان پاسخ (ساعت)</Label>
              <Input type="number" min="1" value={responseTimeHours} onChange={(e) => setResponseTimeHours(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>زمان حل (ساعت)</Label>
              <Input type="number" min="1" value={resolutionTimeHours} onChange={(e) => setResolutionTimeHours(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={isPending}>ذخیره</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
