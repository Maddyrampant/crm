"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSurveyAction } from "@/actions/csat-surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function SurveyFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [contactId, setContactId] = useState("");
  const [type, setType] = useState("csat");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSurveyAction({ contactId, type: type as "csat" | "nps" | "ces" });
      if (result.ok) {
        toast.success("نظرسنجی ایجاد شد");
        setContactId("");
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
          <DialogTitle>نظرسنجی جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>شناسه مشتری</Label>
            <Input dir="rtl" value={contactId} onChange={(e) => setContactId(e.target.value)} required placeholder="شناسه مشتری" />
          </div>
          <div className="space-y-2">
            <Label>نوع نظرسنجی</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csat">CSAT</SelectItem>
                <SelectItem value="nps">NPS</SelectItem>
                <SelectItem value="ces">CES</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={isPending}>ایجاد</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
