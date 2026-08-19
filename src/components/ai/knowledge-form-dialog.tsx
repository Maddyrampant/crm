"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createKnowledgeAction, updateKnowledgeAction } from "@/actions/ai-knowledge";
import type { AiKnowledge } from "@/db/schema/ai-knowledge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AiKnowledge | null;
};

const CATEGORIES = [
  { value: "sales_advice", label: "توصیه فروش" },
  { value: "product_info", label: "اطلاعات محصول" },
  { value: "support_faq", label: "سوالات پشتیبانی" },
  { value: "objection_handling", label: "مدیریت اعتراض" },
  { value: "follow_up", label: "پیگیری" },
  { value: "custom", label: "سفارشی" },
];

export function KnowledgeFormDialog({ open, onOpenChange, item }: Props) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>(item?.category ?? "custom");
  const [title, setTitle] = useState(item?.title ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [tagsInput, setTagsInput] = useState(item?.tags?.join(", ") ?? "");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const data = { category, title, content, tags };
    const result = item
      ? await updateKnowledgeAction(item.id, data)
      : await createKnowledgeAction(data);

    setLoading(false);
    if (!result.ok) {
      toast.error(result.error ?? "خطا در ذخیره");
      return;
    }
    toast.success(item ? "ویرایش شد" : "ایجاد شد");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{item ? "ویرایش مورد دانش" : "مورد دانش جدید"}</DialogTitle>
            <DialogDescription>
              اطلاعاتی که AI برای پاسخ‌دهی استفاده می‌کند
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>دسته‌بندی</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>عنوان</Label>
              <Input
                dir="rtl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>محتوا</Label>
              <Textarea
                dir="rtl"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>برچسب‌ها (با کاما جدا کنید)</Label>
              <Input
                dir="rtl"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="فروش, محصول, قیمت"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {item ? "ذخیره تغییرات" : "ایجاد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
