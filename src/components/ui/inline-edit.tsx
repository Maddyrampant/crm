"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BaseProps = {
  value: string | number;
  onSave: (value: string | number) => void | Promise<void>;
  className?: string;
  displayClassName?: string;
  disabled?: boolean;
  dir?: "rtl" | "ltr";
  formatDisplay?: (value: string | number) => React.ReactNode;
};

type TextEditProps = BaseProps & {
  type?: "text";
};

type NumberEditProps = BaseProps & {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
};

type SelectEditProps = BaseProps & {
  type: "select";
  options: { value: string; label: string }[];
};

type InlineEditProps = TextEditProps | NumberEditProps | SelectEditProps;

export function InlineEdit({
  value,
  onSave,
  type = "text",
  className,
  displayClassName,
  disabled = false,
  dir = "rtl",
  formatDisplay,
  ...rest
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | number>(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      if (type === "select") {
        requestAnimationFrame(() => selectRef.current?.click());
      } else {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
  }, [editing, type]);

  const commit = useCallback(async () => {
    setEditing(false);
    if (draft === value) return;
    try {
      await onSave(draft);
    } catch {
      setDraft(value);
    }
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [commit, cancel]
  );

  const displayValue =
    formatDisplay
      ? formatDisplay(value)
      : type === "number"
        ? Number(value).toLocaleString("fa-IR")
        : String(value);

  if (type === "select") {
    const options = (rest as SelectEditProps).options;
    return (
      <div className={cn("group relative inline-flex items-center", className)}>
        {editing ? (
          <Select
            value={String(draft)}
            onValueChange={(v) => {
              setDraft(v);
              onSave(v);
              setEditing(false);
            }}
            onOpenChange={(open) => {
              if (!open && editing) cancel();
            }}
          >
            <SelectTrigger ref={selectRef} className="h-7 w-full min-w-0 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setEditing(true)}
            className={cn(
              "flex min-h-[28px] cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-sm transition-colors",
              "hover:bg-muted/60",
              "disabled:cursor-not-allowed disabled:opacity-50",
              dir === "rtl" ? "direction-rtl" : "direction-ltr",
              displayClassName
            )}
            dir={dir}
          >
            <span className="truncate">{displayValue}</span>
            {!disabled && (
              <Pencil className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-50 rtl:-scale-x-100" />
            )}
          </button>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <div className={cn("inline-flex items-center", className)} dir={dir}>
        <Input
          ref={inputRef}
          type={(rest as TextEditProps | NumberEditProps).type ?? "text"}
          value={draft}
          onChange={(e) =>
            setDraft(
              type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
            )
          }
          onBlur={commit}
          onKeyDown={handleKeyDown}
          min={type === "number" ? (rest as NumberEditProps).min : undefined}
          max={type === "number" ? (rest as NumberEditProps).max : undefined}
          step={type === "number" ? (rest as NumberEditProps).step : undefined}
          className="h-7 text-sm"
          dir={dir}
        />
      </div>
    );
  }

  return (
    <div className={cn("group relative inline-flex items-center", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setEditing(true)}
        className={cn(
          "flex min-h-[28px] cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-sm transition-colors",
          "hover:bg-muted/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          dir === "rtl" ? "direction-rtl" : "direction-ltr",
          displayClassName
        )}
        dir={dir}
      >
        <span className="truncate">{displayValue}</span>
        {!disabled && (
          <Pencil className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-50 rtl:-scale-x-100" />
        )}
      </button>
    </div>
  );
}
