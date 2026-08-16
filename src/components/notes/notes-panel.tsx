"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { addNoteAction, getNotesAction } from "@/actions/contacts";
import { formatDateTime } from "@/lib/format";

export type NoteEntityType =
  | "contact"
  | "company"
  | "deal"
  | "invoice"
  | "appointment"
  | "task"
  | "payment";

type NoteRow = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
  authorName?: string;
};

type Props = {
  entityType: NoteEntityType;
  entityId: string;
};

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const rtf = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.round(months / 12), "year");
}

export function NotesPanel({ entityType, entityId }: Props) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getNotesAction({ entityType, entityId });
    if (result.ok) {
      setNotes((result.data ?? []) as unknown as NoteRow[]);
      setError(null);
    } else {
      setError(result.error ?? "خطا در دریافت یادداشت‌ها");
    }
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    let cancelled = false;
    getNotesAction({ entityType, entityId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setNotes((result.data ?? []) as unknown as NoteRow[]);
          setError(null);
        } else {
          setError(result.error ?? "خطا در دریافت یادداشت‌ها");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  async function handleAdd() {
    const text = body.trim();
    if (!text || adding) return;
    setAdding(true);
    setError(null);
    const result = await addNoteAction({ entityType, entityId, body: text });
    setAdding(false);
    if (!result.ok) {
      setError(result.error ?? "خطا در ثبت یادداشت");
      return;
    }
    setBody("");
    toast.success("یادداشت ذخیره شد");
    await load();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">یادداشت‌ها</CardTitle>
        <Badge variant="secondary">{notes.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Textarea
            dir="rtl"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="یادداشت جدید بنویسید..."
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!body.trim() || adding}
            >
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              افزودن
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            در حال بارگذاری...
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="یادداشتی ثبت نشده است"
            description="اولین یادداشت را برای این مورد اضافه کنید."
          />
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border bg-muted/30 p-3">
                <p className="whitespace-pre-wrap break-words text-sm">{note.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{note.authorName ?? "کاربر"}</span>
                  <span aria-hidden>·</span>
                  <time
                    dateTime={note.createdAt}
                    title={formatDateTime(note.createdAt)}
                  >
                    {formatRelativeTime(note.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
