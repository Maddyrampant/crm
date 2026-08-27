"use client";

import { useEffect, useRef } from "react";
import {
  Copy,
  Maximize2,
  Minus,
  Minimize2,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  x: number;
  y: number;
  maximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onCloseWindow: () => void;
};

type Item = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
};

export function WindowContextMenu({
  x,
  y,
  maximized,
  onClose,
  onMinimize,
  onToggleMaximize,
  onReset,
  onRefresh,
  onCloseWindow,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function clampAndShow() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let nx = x;
      let ny = y;
      if (nx + rect.width > vw) nx = vw - rect.width - 4;
      if (ny + rect.height > vh) ny = vh - rect.height - 4;
      el.style.left = `${Math.max(4, nx)}px`;
      el.style.top = `${Math.max(4, ny)}px`;
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    requestAnimationFrame(clampAndShow);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [x, y, onClose]);

  const items: Item[] = [
    { label: "تازه‌سازی", icon: <RotateCcw className="size-3.5" />, onClick: onRefresh },
    { label: "کوچک‌نمایی", icon: <Minus className="size-3.5" />, onClick: onMinimize },
    {
      label: maximized ? "بازگردانی" : "بزرگ‌نمایی",
      icon: maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />,
      onClick: onToggleMaximize,
    },
    { label: "بازنشانی موقعیت", icon: <Copy className="size-3.5" />, onClick: onReset },
    {
      label: "بستن پنجره",
      icon: <X className="size-3.5" />,
      onClick: onCloseWindow,
      danger: true,
    },
  ];

  return (
    <div
      ref={ref}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[9999] w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent",
            item.danger && "text-destructive hover:bg-destructive/10"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
