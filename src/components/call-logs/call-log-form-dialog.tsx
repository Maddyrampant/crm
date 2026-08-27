"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCallLogAction } from "@/actions/call-logs";
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

export function CallLogFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [direction, setDirection] = useState("outbound");
  const [outcome, setOutcome] = useState<string>("connected");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCallLogAction({
        phone,
        direction,
        outcome,
        duration: duration ? parseInt(duration) : undefined,
        notes: notes || undefined,
      });
      if (result.ok) {
        toast.success("تماس ثبت شد");
        setPhone("");
        setNotes("");
        setDuration("");
        onSaved();
      } else {
        toast.error("خطا در ثبت");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ثبت تماس جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>شماره تلفن</Label>
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09121234567" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>جهت</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">خروجی</SelectItem>
                  <SelectItem value="inbound">ورودی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">متصل</SelectItem>
                  <SelectItem value="no_answer">بی‌پاسخ</SelectItem>
                  <SelectItem value="voicemail">پیام صوتی</SelectItem>
                  <SelectItem value="busy">مشغول</SelectItem>
                  <SelectItem value="wrong_number">شماره اشتباه</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>مدت (ثانیه)</Label>
            <Input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="120" />
          </div>
          <div className="space-y-2">
            <Label>یادداشت</Label>
            <textarea dir="rtl" className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
