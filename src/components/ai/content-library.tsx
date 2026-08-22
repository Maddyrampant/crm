"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileVideo,
  FileText,
  Image as ImageIcon,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { deleteContentAction } from "@/actions/ai-content";
import { ContentFormDialog } from "@/components/ai/content-form-dialog";
import type { AiContent } from "@/db/schema/ai-content";

const TYPE_LABELS: Record<string, string> = {
  video_link: "ویدیو",
  document: "مستند",
  image: "تصویر",
  custom: "سفارشی",
};

const TYPE_ICONS: Record<string, typeof FileVideo> = {
  video_link: FileVideo,
  document: FileText,
  image: ImageIcon,
  custom: Link2,
};

type Props = {
  items: AiContent[];
};

export function ContentLibrary({ items }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiContent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (searchInput) params.set("search", searchInput);
    else params.delete("search");
    if (typeFilter !== "all") params.set("type", typeFilter);
    else params.delete("type");
    params.set("page", "1");
    router.replace(`?${params.toString()}`);
  }, [searchInput, typeFilter]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: AiContent) {
    setEditing(item);
    setDialogOpen(true);
  }

  async function handleDelete(item: AiContent) {
    if (busyId) return;
    if (!confirm(`«${item.title}» حذف شود؟`)) return;
    setBusyId(item.id);
    const result = await deleteContentAction(item.id);
    setBusyId(null);
    if (!result.ok) {
      toast.error("خطا در حذف");
      return;
    }
    toast.success("حذف شد");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">کتابخانه محتوا</CardTitle>
          <CardDescription>
            ویدیو، مستند و تصاویر برای تخصیص به مخاطبان
          </CardDescription>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" />
          محتوای جدید
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              className="ps-8"
              placeholder="جستجو در عنوان..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="نوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={FileVideo}
            title="محتوایی ثبت نشده"
            description="اولین محتوا را اضافه کنید."
            className="py-10"
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? Link2;
              return (
                <li key={item.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-muted p-2">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="grid gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.title}</p>
                          <Badge variant="secondary">
                            {TYPE_LABELS[item.type] ?? item.type}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-primary"
                          >
                            مشاهده لینک
                          </a>
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        disabled={busyId === item.id}
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <ContentFormDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editing}
        />
      </CardContent>
    </Card>
  );
}
