"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessagingDemo() {
  const [messages, setMessages] = useState<string[]>([
    "سلام! این یک پنجره پیام‌رسان نمونه است.",
    "شما می‌توانید این پنجره را جابه‌جا، بزرگ و کوچک کنید.",
  ]);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    setMessages((m) => [...m, draft]);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
          >
            {m}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="پیام خود را بنویسید..."
        />
        <Button size="icon" onClick={send}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
