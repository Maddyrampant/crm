"use client";

import { useState } from "react";
import { BarChart3, MessageSquare, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessagingDemo } from "./demos/messaging-demo";
import { NotesDemo } from "./demos/notes-demo";
import { ChartDemo } from "./demos/chart-demo";
import { useWindowStore } from "@/store/window-store";
import { cn } from "@/lib/utils";

function WindowIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn("flex size-5 shrink-0 items-center justify-center")}>
      {children}
    </span>
  );
}

export function WindowDemo() {
  const openWindow = useWindowStore((s) => s.openWindow);

  function openMessaging() {
    openWindow({
      id: "demo-messaging",
      title: "پیام‌رسان داخلی",
      icon: (
        <WindowIcon>
          <MessageSquare className="size-4 text-primary" />
        </WindowIcon>
      ),
      content: <MessagingDemo />,
      width: 480,
      height: 420,
    });
  }

  function openNotes() {
    openWindow({
      id: "demo-notes",
      title: "یادداشت‌ها",
      icon: (
        <WindowIcon>
          <NotebookPen className="size-4 text-primary" />
        </WindowIcon>
      ),
      content: <NotesDemo />,
      width: 400,
      height: 340,
    });
  }

  function openChart() {
    openWindow({
      id: "demo-chart",
      title: "گزارش فروش",
      icon: (
        <WindowIcon>
          <BarChart3 className="size-4 text-primary" />
        </WindowIcon>
      ),
      content: <ChartDemo />,
      width: 520,
      height: 360,
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">آزمایش پنجره‌ها</CardTitle>
        <span className="text-xs text-muted-foreground">پایلوت سیستم پنجره</span>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={openMessaging}>
          <MessageSquare className="ml-1 size-4" />
          باز کردن پیام‌رسان
        </Button>
        <Button variant="outline" onClick={openNotes}>
          <NotebookPen className="ml-1 size-4" />
          باز کردن یادداشت
        </Button>
        <Button variant="outline" onClick={openChart}>
          <BarChart3 className="ml-1 size-4" />
          باز کردن گزارش
        </Button>
      </CardContent>
    </Card>
  );
}
