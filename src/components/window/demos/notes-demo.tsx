"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NotesDemo() {
  const [text, setText] = useState(
    "یک یادداشت سریع در پنجره...\nموقعیت و اندازه این پنجره ذخیره نمی‌شود ولی قابل جابه‌جایی است."
  );

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="flex-1 resize-none"
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {saved ? "ذخیره شد ✓" : ""}
        </span>
        <Button size="sm" onClick={() => setSaved(true)}>
          ذخیره یادداشت
        </Button>
      </div>
    </div>
  );
}
