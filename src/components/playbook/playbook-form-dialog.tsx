"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createPlaybookAction } from "@/actions/sales-playbook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

type Step = { title: string; description: string };

export function PlaybookFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ title: "", description: "" }]);

  function addStep() {
    setSteps((prev) => [...prev, { title: "", description: "" }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: keyof Step, value: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSteps = steps.filter((s) => s.title.trim());
    if (validSteps.length === 0) {
      toast.error("حداقل یک مرحله وارد کنید");
      return;
    }
    startTransition(async () => {
      const result = await createPlaybookAction({
        name,
        description: description || undefined,
        steps: validSteps,
      });
      if (result.ok) {
        toast.success("لیست پخش ایجاد شد");
        setName("");
        setDescription("");
        setSteps([{ title: "", description: "" }]);
        onSaved();
      } else {
        toast.error("خطا در ایجاد");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>لیست پخش جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نام</Label>
            <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>توضیحات</Label>
            <textarea dir="rtl" className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-3">
            <Label>مراحل</Label>
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-2 text-sm text-muted-foreground">{i + 1}.</span>
                <div className="flex-1 space-y-2">
                  <Input dir="rtl" placeholder="عنوان مرحله" value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)} required />
                  <Input dir="rtl" placeholder="توضیحات (اختیاری)" value={step.description} onChange={(e) => updateStep(i, "description", e.target.value)} />
                </div>
                {steps.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeStep(i)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addStep}>
              <Plus className="size-4" />
              افزودن مرحله
            </Button>
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
