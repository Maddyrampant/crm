"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { createFieldAction } from "@/actions/custom-fields";

const entityOptions = [
  { value: "contact", label: "مخاطب" },
  { value: "company", label: "شرکت" },
  { value: "deal", label: "فروش" },
];

const typeOptions = [
  { value: "text", label: "متن" },
  { value: "number", label: "عدد" },
  { value: "date", label: "تاریخ" },
  { value: "select", label: "انتخابی" },
  { value: "multiselect", label: "چندانتخابی" },
  { value: "boolean", label: "بله/خیر" },
];

type Props = {
  onCreated: () => void;
};

export function FieldForm({ onCreated }: Props) {
  const [pending, startTransition] = useTransition();
  const [entity, setEntity] = useState("contact");
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const needsOptions = type === "select" || type === "multiselect";

  function addOption() {
    const trimmed = newOption.trim();
    if (!trimmed || options.includes(trimmed)) return;
    setOptions((prev) => [...prev, trimmed]);
    setNewOption("");
  }

  function removeOption(opt: string) {
    setOptions((prev) => prev.filter((o) => o !== opt));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("نام فیلد را وارد کنید");
      return;
    }
    startTransition(async () => {
      const res = await createFieldAction({
        entity,
        name: name.trim(),
        type,
        required,
        options: needsOptions ? options : undefined,
      });
      if (res.ok) {
        toast.success("فیلد ایجاد شد");
        setName("");
        setType("text");
        setRequired(false);
        setOptions([]);
        onCreated();
      } else {
        toast.error("خطا در ایجاد فیلد");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">فیلد جدید</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>نهاد</Label>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>نام فیلد</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: کد ملی"
          />
        </div>
        <div className="space-y-2">
          <Label>نوع</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch
            id="required"
            checked={required}
            onCheckedChange={setRequired}
          />
          <Label htmlFor="required">الزامی</Label>
        </div>
      </div>

      {needsOptions && (
        <div className="space-y-2">
          <Label>گزینه‌ها</Label>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="گزینه جدید"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {options.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() => removeOption(opt)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "در حال ایجاد..." : "ایجاد فیلد"}
      </Button>
    </form>
  );
}
