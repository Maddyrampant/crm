"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Image, File, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listAttachmentsAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
} from "@/actions/attachments";

type AttachmentRow = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  createdAt: Date | string;
};

type Props = {
  entityType: string;
  entityId: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

export function AttachmentPanel({ entityType, entityId }: Props) {
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttachmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    const result = await listAttachmentsAction(entityType, entityId);
    if (result.ok) setAttachments(result.data as AttachmentRow[]);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(file: File) {
    if (uploading) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadAttachmentAction(entityType, entityId, fd);
    setUploading(false);
    if (result.ok) {
      toast.success("فایل بارگذاری شد");
      await load();
    } else {
      toast.error(result.error ?? "خطا در بارگذاری");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteAttachmentAction(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.ok) {
      toast.success("فایل حذف شد");
      await load();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">پیوست‌ها</CardTitle>
        <Badge variant="secondary">{attachments.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={dropRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            فایل را اینجا رها کنید یا کلیک کنید
          </p>
          <p className="text-xs text-muted-foreground">افزودن فایل</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileChange}
        />

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            در حال بارگذاری...
          </div>
        ) : attachments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="پیوستی ثبت نشده است"
            description="فایلی برای این مورد بارگذاری نشده."
          />
        ) : (
          <ul className="space-y-2">
            {attachments.map((att) => {
              const Icon = getFileIcon(att.mimeType);
              return (
                <li
                  key={att.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {att.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(att.size)}
                    </p>
                  </div>
                  <a
                    href={`/api/attachments/${att.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="icon-sm">
                      <Download className="size-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(att)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف فایل</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              آیا از حذف «{deleteTarget?.filename}» مطمئنید؟
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                انصراف
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "حذف"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
