"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { AiConversation, AiToolRun } from "@/db/schema";
import { DEFAULT_MODEL, MODEL_OPTIONS } from "@/lib/ai/models";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  assignContent: "تخصیص محتوا",
  markContentViewed: "مشاهده محتوا",
  searchContacts: "جستجوی مخاطب",
  getPipelineSummary: "خلاصه فانل",
  getDealsByStage: "فرصت‌ها بر اساس مرحله",
  getRecentActivity: "آخرین فعالیت‌ها",
  getContactDetail: "جزئیات مخاطب",
  getDealDetail: "جزئیات فرصت",
  getInvoiceDetail: "جزئیات فاکتور",
  getProductDetail: "جزئیات کالا",
  listContacts: "لیست مخاطبان",
  listDeals: "لیست فرصت‌ها",
  listInvoices: "لیست فاکتورها",
  listProducts: "لیست کالاها",
  getStockLevels: "سطوح موجودی",
  searchKnowledgeBase: "جستجوی دانش",
  getContentLibrary: "کتابخانه محتوا",
  listContentLibrary: "لیست محتوا",
};

const QUICK_PROMPTS = [
  { text: "خلاصه فروش‌های امروز", icon: Circle },
  { text: "مخاطبان جدید این هفته", icon: Circle },
  { text: "فاکتورهای سررسید شده", icon: Circle },
  { text: "گزارش عملکرد تیم", icon: Circle },
  { text: "پیشنهاد پیگیری مشتریان", icon: Circle },
  { text: "وضعیت موجودی انبار", icon: Circle },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    stop,
  } = useChat({ transport });

  const streaming = status === "streaming" || status === "submitted";

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const autoScroll = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (streaming) autoScroll();
  }, [messages, streaming, autoScroll]);

  useEffect(() => {
    autoScroll();
  }, [messages.length, autoScroll]);

  function submit() {
    if (!input.trim() || streaming || disabled) return;
    sendMessage({ text: input });
    setInput("");
  }

  function startNewChat() {
    setConversationId(crypto.randomUUID());
    setMessages([]);
    inputRef.current?.focus();
  }

  function changeModel(id: string) {
    setModel(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODEL_STORAGE_KEY, id);
    }
  }

  async function openConversation(id: string) {
    setConversationId(id);
    setMessages([]);
    try {
      const res = await fetch(`/api/ai/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        const uiMessages: UIMessage[] = data.messages.map(
          (m: { id: string; role: string; content: string; toolCalls?: Array<Record<string, unknown>>; usage?: unknown }) => {
            const parts: UIMessage["parts"] = [];
            if (m.content) {
              parts.push({ type: "text", text: m.content });
            }
            for (const tc of m.toolCalls ?? []) {
              parts.push({
                type: "dynamic-tool",
                toolCallId: String(tc.toolCallId ?? tc.id ?? ""),
                toolName: String(tc.tool ?? tc.toolName ?? ""),
                state: "output-available" as const,
                input: tc.input ?? tc.args ?? {},
                output: tc.result ?? tc.output ?? undefined,
              });
            }
            if (parts.length === 0) {
              parts.push({ type: "text", text: "" });
            }
            return {
              id: m.id,
              role: m.role as "user" | "assistant",
              parts,
              metadata: m.usage ? { usage: m.usage } : undefined,
            };
          }
        );
        setMessages(uiMessages);
      }
    } catch {
      // silent fail — show empty chat
    }
    router.refresh();
  }

  async function decide(run: AiToolRun, approved: boolean) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setApproving(run.id);
    try {
      const res = await fetch(`/api/ai/tools/${run.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved }),
        signal: controller.signal,
      });
      if (res.ok) router.refresh();
    } finally {
      setApproving(null);
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    await fetch(`/api/ai/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    setRenamingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("این گفتگو حذف شود؟")) return;
    setDeletingId(id);
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    if (conversationId === id) {
      setConversationId(null);
      setMessages([]);
    }
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <div className="space-y-4">
        <Button className="w-full" onClick={startNewChat} disabled={disabled}>
          <Plus />
          گفتگوی جدید
        </Button>

        <Card>
          <CardContent className="space-y-2 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                dir="rtl"
                className="h-8 ps-7 text-xs"
                placeholder="جستجو..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredConversations.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">
                گفتگویی ندارید
              </p>
            )}
            {filteredConversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-start gap-2 rounded-lg p-2 text-right text-sm transition-colors hover:bg-accent",
                  conversationId === c.id && "bg-accent"
                )}
              >
                <button
                  className="flex min-w-0 flex-1 items-start gap-2"
                  onClick={() => openConversation(c.id)}
                >
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    {renamingId === c.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRename(c.id);
                        }}
                        className="flex gap-1"
                      >
                        <Input
                          dir="rtl"
                          className="h-6 text-xs"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          onBlur={() => setRenamingId(null)}
                        />
                      </form>
                    ) : (
                      <>
                        <span className="block truncate font-medium">
                          {c.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(c.updatedAt)}
                        </span>
                      </>
                    )}
                  </span>
                </button>
                {renamingId !== c.id && (
                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="rounded p-0.5 hover:bg-muted"
                      title="تغییر نام"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(c.id);
                        setRenameValue(c.title);
                      }}
                    >
                      <Pencil className="size-3 text-muted-foreground" />
                    </button>
                    <button
                      className="rounded p-0.5 hover:bg-destructive/10"
                      title="حذف"
                      disabled={deletingId === c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="size-3 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="size-3 text-destructive" />
                      )}
                    </button>
                  </div>
                )}
              </div>
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

      {/* Main Chat */}
      <Card className="flex h-[calc(100vh-14rem)] flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {streaming
              ? "در حال پاسخ‌دهی..."
              : "عملیات نوشتنی پیش از اجرا نیاز به تأیید شما دارد."}
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
            <div ref={scrollRef} className="space-y-4 p-4">
              {messages.length === 0 && !streaming && (
                <div className="flex h-full min-h-40 flex-col items-center justify-center gap-4">
                  <div className="rounded-full bg-muted p-3">
                    <Bot className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    از دستیار هوشمند بپرسید
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p.text}
                        className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        onClick={() => {
                          setInput(p.text);
                          inputRef.current?.focus();
                        }}
                      >
                        {p.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m: UIMessage) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onCopy={() => {
                    const text = m.parts
                      ?.filter((p) => p.type === "text")
                      .map((p) => (p as { type: "text"; text: string }).text)
                      .join("");
                    if (text) navigator.clipboard.writeText(text);
                  }}
                />
              ))}
              {streaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                <div className="flex items-start gap-2">
                  <div className="rounded-2xl bg-muted px-4 py-2 text-sm">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
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
            {streaming && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0"
                onClick={stop}
              >
                <Square className="size-3 fill-current" />
              </Button>
            )}
            <Textarea
              ref={inputRef}
              rows={1}
              placeholder="پیام خود را بنویسید…"
              className="max-h-40 min-h-10 flex-1 resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={disabled}
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
              disabled={disabled || !input.trim()}
            >
              <Send className="size-4 -scale-x-100" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  onCopy,
}: {
  message: UIMessage;
  onCopy: () => void;
}) {
  const isUser = message.role === "user";
  const text =
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") ?? "";
  const toolParts = (message.parts ?? []).filter(
    (p) => p.type === "dynamic-tool"
  ) as Array<{ type: "dynamic-tool"; toolName: string; state: string; input?: unknown; output?: unknown }>;
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
    <div className={cn("group/msg flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-6",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{text}</span>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
          </div>
        )}
      </div>

      {toolParts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {toolParts.map((ti, i) => {
            const isWrite = [
              "createContact", "createTask", "createDeal", "updateDealStage",
              "createInvoice", "sendEmail", "sendSms", "assignContent", "markContentViewed",
            ].includes(ti.toolName);
            const isPending = ti.state !== "result";
            return (
              <div
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]",
                  isWrite
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                )}
              >
                {isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : isWrite ? (
                  <ShieldAlert className="size-3" />
                ) : (
                  <CheckCircle2 className="size-3" />
                )}
                <span>{toolLabels[ti.toolName] ?? ti.toolName}</span>
                {ti.state === "output-available" && ti.output != null && (
                  <span className="opacity-60">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(showUsage || !isUser) && (
        <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
          {showUsage && (
            <>
              {stepCount > 0 && <span>{formatNumber(stepCount)} قدم</span>}
              {usage?.totalTokens != null && (
                <span>{formatNumber(usage.totalTokens)} توکن</span>
              )}
              {meta?.finishReason === "length" && (
                <span className="text-amber-500">پاسخ کامل نشد</span>
              )}
            </>
          )}
          {!isUser && (
            <button
              className="opacity-0 group-hover/msg:opacity-100 transition-opacity hover:text-foreground"
              onClick={onCopy}
              title="کپی"
            >
              <Copy className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
