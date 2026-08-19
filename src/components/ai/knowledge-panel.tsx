"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Inbox, Loader2, Pencil, Plus, Search, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
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
import { deleteKnowledgeAction, toggleKnowledgeAction } from "@/actions/ai-knowledge";
import { KnowledgeFormDialog } from "@/components/ai/knowledge-form-dialog";
import type { AiKnowledge } from "@/db/schema/ai-knowledge";

const CATEGORY_LABELS: Record<string, string> = {
  sales_advice: "توصیه فروش",
  product_info: "اطلاعات محصول",
  support_faq: "سوالات پشتیبانی",
  objection_handling: "مدیریت اعتراض",
  follow_up: "پیگیری",
  custom: "سفارشی",
};

type Props = {
  items: AiKnowledge[];
};

export function KnowledgePanel({ items }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiKnowledge | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (searchInput) params.set("search", searchInput);
    else params.delete("search");
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    else params.delete("category");
    params.set("page", "1");
    router.replace(`?${params.toString()}`);
  }, [searchInput, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: AiKnowledge) {
    setEditing(item);
    setDialogOpen(true);
  }

  async function handleToggle(item: AiKnowledge, active: boolean) {
    if (busyId) return;
    setBusyId(item.id);
    const result = await toggleKnowledgeAction(item.id, active);
    setBusyId(null);
    if (!result.ok) {
      toast.error("خطا در تغییر وضعیت");
      return;
    }
    router.refresh();
  }

  async function handleDelete(item: AiKnowledge) {
    if (busyId) return;
    if (!confirm(`«${item.title}» حذف شود؟`)) return;
    setBusyId(item.id);
    const result = await deleteKnowledgeAction(item.id);
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
          <CardTitle className="text-base">پایگاه دانش AI</CardTitle>
          <CardDescription>
            اطلاعات فروش، محصول و پشتیبانی برای پاسخ‌دهی هوشمند
          </CardDescription>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" />
          مورد جدید
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              className="ps-8"
              placeholder="جستجو در عنوان یا محتوا..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="دسته‌بندی" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="موردی ثبت نشده"
            description="اولین مورد دانش را اضافه کنید."
            className="py-10"
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </Badge>
                      {!item.active && <Badge variant="outline">غیرفعال</Badge>}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{formatDateTime(item.createdAt)}</span>
                      {item.tags && item.tags.length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {item.tags.map((t, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={busyId === item.id}
                      onClick={() => handleToggle(item, !item.active)}
                      className="text-muted-foreground hover:text-foreground"
                      title={item.active ? "غیرفعال کردن" : "فعال کردن"}
                    >
                      {busyId === item.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : item.active ? (
                        <ToggleRight className="size-5 text-primary" />
                      ) : (
                        <ToggleLeft className="size-5" />
                      )}
                    </button>
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
            ))}
          </ul>
        )}

        <KnowledgeFormDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editing}
        />
      </CardContent>
    </Card>
  );
}
