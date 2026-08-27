"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSequenceAction } from "@/actions/email-sequences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function SequenceFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSequenceAction({ name, subject, body });
      if (result.ok) {
        toast.success("دنباله ایجاد شد");
        setName("");
        setSubject("");
        setBody("");
        onSaved();
      } else {
        toast.error("خطا در ایجاد");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>دنباله جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نام</Label>
            <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>موضوع ایمیل</Label>
            <Input dir="rtl" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>متن ایمیل</Label>
            <textarea dir="rtl" className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} required />
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
