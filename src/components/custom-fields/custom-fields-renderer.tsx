"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFieldsForEntityAction,
  getFieldValuesAction,
  setFieldValueAction,
} from "@/actions/custom-fields";
import type { CustomFieldDef } from "@/services/custom-fields";

type Props = {
  entityId: string;
  entity: string;
};

export function CustomFieldsRenderer({ entityId, entity }: Props) {
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [defsResult, valsResult] = await Promise.all([
        getFieldsForEntityAction(entity),
        getFieldValuesAction(entityId, entity),
      ]);
      setFields(defsResult.data ?? []);
      setValues(valsResult.data ?? {});
      setLoading(false);
    }
    load();
  }, [entityId, entity]);

  async function handleChange(fieldId: string, value: string | null) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    const result = await setFieldValueAction(entityId, entity, fieldId, value);
    if (result.ok) {
      toast.success("ذخیره شد");
      router.refresh();
    } else {
      toast.error("خطا در ذخیره");
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">در حال بارگذاری...</div>;
  }

  if (fields.length === 0) return null;

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.id} className="grid gap-1.5">
          <Label>{field.name}{field.required && " *"}</Label>
          <FieldInput field={field} value={values[field.id] ?? null} onChange={(v) => handleChange(field.id, v)} />
        </div>
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDef;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <Input
          dir="rtl"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          dir="ltr"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          />
          <span className="text-sm text-muted-foreground">
            {value === "true" ? "بله" : "خیر"}
          </span>
        </div>
      );
    case "select":
      return (
        <Select value={value ?? ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="انتخاب کنید..." />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return (
        <Input
          dir="rtl"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }
}
