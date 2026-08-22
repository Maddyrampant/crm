"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_TYPE_META } from "@/lib/notifications";

const STORAGE_KEY = "notification-preferences";

const DEFAULT_PREFS: Record<string, boolean> = {
  invoice: true,
  payment: true,
  deal: true,
  task: true,
  appointment: true,
  ai: true,
  contact: true,
  system: true,
};

function loadPrefs(): Record<string, boolean> {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);

  const toggle = (type: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [type]: !prev[type] };
      savePrefs(next);
      return next;
    });
  };

  if (!mounted) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 border-b p-4">
        <Bell className="size-4" />
        <span className="text-sm font-medium">تنظیمات اعلان‌ها</span>
      </div>
      <div className="divide-y divide-border">
        {(Object.keys(NOTIFICATION_TYPE_META) as Array<keyof typeof NOTIFICATION_TYPE_META>).map(
          (type) => (
            <div key={type} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{NOTIFICATION_TYPE_META[type].label}</span>
              <Switch
                size="sm"
                checked={prefs[type] ?? true}
                onCheckedChange={() => toggle(type)}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function getNotificationPrefs(): Record<string, boolean> {
  return loadPrefs();
}
