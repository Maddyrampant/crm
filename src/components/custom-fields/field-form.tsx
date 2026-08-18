"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createFieldAction } from "@/actions/custom-fields";
import type { CustomFieldDef } from "@/services/custom-fields";

type Props = {
  entity: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (field: CustomFieldDef) => void;
};

const FIELD_TYPES = [
  { value: "text", label: "متن" },
  { value: "number", label: "عدد" },
  { value: "select", label: "انتخابی" },
  { value: "date", label: "تاریخ" },
  { value: "boolean", label: "بله/خیر" },
] as const;

export function FieldForm({ entity, open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");
  const [saving, setSaving] = useState(false);

  function addOption() {
    const val = optionInput.trim();
    if (!val || options.includes(val)) return;
    setOptions((prev) => [...prev, val]);
    setOptionInput("");
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await createFieldAction({
      entity,
      name: name.trim(),
      type,
      required,
      options: type === "select" ? options : undefined,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("فیلد ایجاد شد");
      onCreated(result.data as CustomFieldDef);
      setName("");
      setType("text");
      setRequired(false);
      setOptions([]);
    } else {
      toast.error("خطا در ایجاد فیلد");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>افزودن فیلد جدید</DialogTitle>
          <DialogDescription>
            یک فیلد سفارشی برای این موجودیت تعریف کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label>نام فیلد</Label>
            <Input
              dir="rtl"
              placeholder="مثال: شماره پروانه"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>نوع فیلد</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "select" && (
            <div className="grid gap-1.5">
              <Label>گزینه‌ها</Label>
              <div className="flex gap-2">
                <Input
                  dir="rtl"
                  placeholder="گزینه جدید..."
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button type="button" size="icon" variant="outline" onClick={addOption}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {options.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {options.map((opt, idx) => (
                    <li
                      key={opt}
                      className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="field-required"
              checked={required}
              onCheckedChange={(checked) => setRequired(checked === true)}
            />
            <Label htmlFor="field-required">الزامی</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
