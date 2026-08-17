"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setFieldValueAction } from "@/actions/custom-fields";

type FieldDef = {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  required: boolean;
};

type Props = {
  fields: FieldDef[];
  entityId: string;
  entity: string;
  values: Record<string, string | null>;
};

export function CustomFieldRenderer({ fields, entityId, entity, values }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">فیلدهای سفارشی</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            entityId={entityId}
            entity={entity}
            value={values[f.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  entityId,
  entity,
  value,
}: {
  field: FieldDef;
  entityId: string;
  entity: string;
  value: string | null;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [pending, startTransition] = useTransition();

  function save(newValue: string | null) {
    setLocalValue(newValue);
    startTransition(async () => {
      await setFieldValueAction(entityId, entity, field.id, newValue);
    });
  }

  switch (field.type) {
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={localValue === "true"}
            onCheckedChange={(checked) => save(checked ? "true" : "false")}
            disabled={pending}
          />
          <Label>{field.name}</Label>
        </div>
      );

    case "date":
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <Input
            type="date"
            value={localValue ?? ""}
            onChange={(e) => save(e.target.value || null)}
            disabled={pending}
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <Input
            type="number"
            value={localValue ?? ""}
            onChange={(e) => save(e.target.value || null)}
            disabled={pending}
          />
        </div>
      );

    case "select":
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <Select
            value={localValue ?? ""}
            onValueChange={(v) => save(v)}
            disabled={pending}
          >
            <SelectTrigger>
              <SelectValue placeholder="انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "multiselect":
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <div className="flex flex-wrap gap-1">
            {(field.options ?? []).map((opt) => {
              const selected = (localValue ?? "").split(",").includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`rounded-md px-2 py-0.5 text-xs border transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  disabled={pending}
                  onClick={() => {
                    const current = (localValue ?? "").split(",").filter(Boolean);
                    const next = selected
                      ? current.filter((v) => v !== opt)
                      : [...current, opt];
                    save(next.join(",") || null);
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <Input
            value={localValue ?? ""}
            onChange={(e) => save(e.target.value || null)}
            disabled={pending}
          />
        </div>
      );
  }
}
