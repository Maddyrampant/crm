"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteVoiceNoteAction } from "@/actions/voice-notes";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { VoiceNote } from "@/db/schema";

type Props = {
  initialNotes: VoiceNote[];
  canManage: boolean;
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceNotesManager({ initialNotes, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes);

  async function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این یادداشت صوتی اطمینان دارید؟")) return;
    const result = await deleteVoiceNoteAction(id);
    if (result.ok) {
      toast.success("یادداشت صوتی حذف شد");
      setNotes((prev) => prev.filter((n) => n.id !== id));
      handleRefresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">یادداشت‌های صوتی</CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="هنوز یادداشت صوتی ثبت نشده"
            description="یادداشت صوتی خود را روی مخاطبین یا فروش‌ها ضبط کنید."
          />
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Mic className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {n.entityType}
                      {n.transcription
                        ? ` — ${n.transcription.slice(0, 80)}${n.transcription.length > 80 ? "…" : ""}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(n.duration)} · {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="حذف"
                      disabled={isPending}
                      onClick={() => handleDelete(n.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
