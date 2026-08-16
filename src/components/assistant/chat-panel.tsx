"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Check, MessageSquare, Plus, Send, ShieldAlert, X } from "lucide-react";
import type { AiConversation, AiToolRun } from "@/db/schema";
import { DEFAULT_MODEL, MODEL_OPTIONS } from "@/lib/ai/models";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ConversationRow = AiConversation & { _count?: number };

const toolLabels: Record<string, string> = {
  createContact: "ساخت مخاطب",
  createTask: "ساخت تسک",
  createDeal: "ساخت فرصت فروش",
  updateDealStage: "تغییر مرحله فرصت",
  createInvoice: "صدور فاکتور",
  sendEmail: "ارسال ایمیل",
  sendSms: "ارسال پیامک",
};

const MODEL_STORAGE_KEY = "crm-ai-model";

function getStoredModel() {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
  return MODEL_OPTIONS.some((m) => m.id === stored) ? stored! : DEFAULT_MODEL;
}

export function ChatPanel({
  conversations,
  pendingRuns,
  disabled,
}: {
  conversations: ConversationRow[];
  pendingRuns: AiToolRun[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [model, setModel] = useState<string>(getStoredModel);

  const transportState = { conversationId, model };
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        prepareSendMessagesRequest: (request) => ({
          body: {
            ...request.body,
            conversationId: transportState.conversationId,
            model: transportState.model,
          },
        }),
      }),
    [transportState.conversationId, transportState.model]
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
  } = useChat({ transport });

  const streaming = status === "streaming" || status === "submitted";

  function submit() {
    if (!input.trim() || streaming || disabled) return;
    sendMessage({ text: input });
    setInput("");
  }

  function startNewChat() {
    setConversationId(crypto.randomUUID());
    setMessages([]);
  }

  function changeModel(id: string) {
    setModel(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODEL_STORAGE_KEY, id);
    }
  }

  function openConversation(id: string) {
    setConversationId(id);
    setMessages([]);
    router.refresh();
  }

  async function decide(run: AiToolRun, approved: boolean) {
    setApproving(run.id);
    const res = await fetch(`/api/ai/tools/${run.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    setApproving(null);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <Button className="w-full" onClick={startNewChat} disabled={disabled}>
          <Plus />
          گفتگوی جدید
        </Button>

        <Card>
          <CardContent className="space-y-1 p-2">
            {conversations.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">
                گفتگویی ندارید
              </p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg p-2 text-right text-sm transition-colors hover:bg-accent",
                  conversationId === c.id && "bg-accent"
                )}
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(c.updatedAt)}
                  </span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={cn(disabled && "opacity-60")}>
          <CardContent className="space-y-2 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="size-4 text-amber-500" />
              در انتظار تأیید ({pendingRuns.length})
            </p>
            {pendingRuns.length === 0 && (
              <p className="text-xs text-muted-foreground">
                درخواست تأییدی نیست
              </p>
            )}
            {pendingRuns.map((run) => (
              <div key={run.id} className="rounded-lg border p-2 text-xs">
                <p className="font-medium">
                  {toolLabels[run.toolName] ?? run.toolName}
                </p>
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                  {JSON.stringify(run.input, null, 2)}
                </pre>
                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 flex-1"
                    disabled={approving === run.id}
                    onClick={() => decide(run, true)}
                  >
                    <Check />
                    تأیید
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-destructive"
                    disabled={approving === run.id}
                    onClick={() => decide(run, false)}
                  >
                    <X />
                    رد
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="flex h-[calc(100vh-14rem)] flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <p className="text-xs text-muted-foreground">
            عملیات نوشتنی پیش از اجرا نیاز به تأیید شما دارد.
          </p>
          <Select value={model} onValueChange={changeModel} disabled={disabled}>
            <SelectTrigger className="h-8 w-52 text-xs">
              <SelectValue placeholder="انتخاب مدل" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {messages.length === 0 && (
                <div className="flex h-full min-h-40 items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground">
                    از دستیار بپرسید، مثلاً:
                    <br />
                    «فروش‌های ۳ ماه اخیر را خلاصه کن» یا
                    <br />
                    «یک مخاطب جدید به نام علی بساز»
                  </p>
                </div>
              )}
              {messages.map((m: UIMessage) =>
                m.role === "user" || m.role === "assistant" ? (
                  <MessageBubble key={m.id} message={m} />
                ) : null
              )}
              {error && (
                <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  خطا در ارتباط با دستیار: {error.message}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <form
          className="border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex gap-2">
            <Textarea
              rows={1}
              placeholder="پیام خود را بنویسید…"
              className="max-h-40 min-h-10 flex-1 resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={disabled || streaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10"
              disabled={disabled || streaming || !input.trim()}
            >
              <Send className="size-4 -scale-x-100" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text =
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") ?? "";
  const stepCount = message.parts.filter((p) => p.type === "step-start").length;
  const meta = message.metadata as
    | {
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        };
        finishReason?: string;
      }
    | undefined;
  const usage = meta?.usage;
  const showUsage =
    !isUser &&
    (stepCount > 0 ||
      usage?.inputTokens != null ||
      usage?.totalTokens != null);

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-6",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {text}
      </div>
      {showUsage && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-[10px] text-muted-foreground">
          {stepCount > 0 && <span>{formatNumber(stepCount)} قدم</span>}
          {usage?.inputTokens != null && (
            <span>ورودی {formatNumber(usage.inputTokens)} توکن</span>
          )}
          {usage?.outputTokens != null && (
            <span>خروجی {formatNumber(usage.outputTokens)} توکن</span>
          )}
          {usage?.totalTokens != null && (
            <span>جمع {formatNumber(usage.totalTokens)} توکن</span>
          )}
          {meta?.finishReason === "length" && (
            <span className="text-amber-500">پاسخ کامل نشد</span>
          )}
        </div>
      )}
    </div>
  );
}
