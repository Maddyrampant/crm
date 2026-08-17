"use client";

import { useState, useEffect } from "react";
import { format as formatJalali, parse as parseJalali } from "date-fns-jalali";
import { Input } from "@/components/ui/input";

type Props = {
  value: string | Date | null | undefined;
  onChange: (isoValue: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromJalaliString(s: string): Date | null {
  const cleaned = s.replace(/[\/\-]/g, "/");
  const match = cleaned.match(/^(\d{4})\/?(\d{1,2})\/?(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const jalaliStr = `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
  try {
    return parseJalali(jalaliStr, "yyyy/MM/dd", new Date());
  } catch {
    return null;
  }
}

function toJalaliDisplay(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "";
  try {
    return formatJalali(new Date(isoOrDate), "yyyy/MM/dd");
  } catch {
    return "";
  }
}

export function JalaliDateInput({
  value,
  onChange,
  placeholder = "yyyy/MM/dd",
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
}: Props) {
  const [display, setDisplay] = useState(() => toJalaliDisplay(value));

  useEffect(() => {
    setDisplay(toJalaliDisplay(value));
  }, [value]);

  return (
    <Input
      id={id}
      dir="ltr"
      className={className}
      placeholder={placeholder}
      value={display}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        setDisplay(raw);
        const d = fromJalaliString(raw);
        if (d) onChange(toIso(d));
        else if (raw.length >= 10) onChange(null);
      }}
      onBlur={() => {
        const d = fromJalaliString(display);
        if (d) {
          setDisplay(toJalaliDisplay(d));
          onChange(toIso(d));
        } else if (display.trim()) {
          // invalid input — revert
          setDisplay(toJalaliDisplay(value));
        }
      }}
      maxLength={10}
    />
  );
}

type DateTimeProps = Props & {
  includeTime?: boolean;
};

export function JalaliDateTimeInput({
  value,
  onChange,
  placeholder = "yyyy/MM/dd HH:mm",
  className,
  disabled,
  id,
  includeTime = true,
  "aria-label": ariaLabel,
}: DateTimeProps) {
  const fmt = includeTime ? "yyyy/MM/dd HH:mm" : "yyyy/MM/dd";
  const [display, setDisplay] = useState(() => {
    if (!value) return "";
    try {
      return formatJalali(new Date(value), fmt);
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (!value) {
      setDisplay("");
      return;
    }
    try {
      setDisplay(formatJalali(new Date(value), fmt));
    } catch {
      /* keep current */
    }
  }, [value, fmt]);

  return (
    <Input
      id={id}
      dir="ltr"
      className={className}
      placeholder={placeholder}
      value={display}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        setDisplay(raw);
        // try to parse date part
        const dateMatch = raw.match(/^(\d{4})\/?(\d{1,2})\/?(\d{1,2})/);
        if (dateMatch) {
          const [, y, m, d] = dateMatch;
          const jalaliDate = `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
          try {
            const parsed = parseJalali(jalaliDate, "yyyy/MM/dd", new Date());
            // parse time if present
            const timeMatch = raw.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch && includeTime) {
              parsed.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
            }
            onChange(parsed.toISOString());
          } catch {
            /* incomplete input */
          }
        }
      }}
      onBlur={() => {
        // format and validate on blur
        if (!value) {
          setDisplay("");
          return;
        }
        try {
          setDisplay(formatJalali(new Date(value), fmt));
        } catch {
          setDisplay("");
        }
      }}
      maxLength={16}
    />
  );
}
