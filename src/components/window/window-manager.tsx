"use client";

import { useWindowStore } from "@/store/window-store";
import { AppWindow } from "@/components/window/app-window";

export function WindowManager() {
  const windows = useWindowStore((s) => s.windows);

  if (windows.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {windows.map((w) => (
        <div key={w.id} className="pointer-events-auto">
          <AppWindow win={w} />
        </div>
      ))}
    </div>
  );
}
