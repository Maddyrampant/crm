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
import { createContentAction, updateContentAction } from "@/actions/ai-content";
import type { AiContent } from "@/db/schema/ai-content";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AiContent | null;
};

const TYPES = [
  { value: "video_link", label: "ویدیو" },
  { value: "document", label: "مستند" },
  { value: "image", label: "تصویر" },
  { value: "custom", label: "سفارشی" },
];

export function ContentFormDialog({ open, onOpenChange, item }: Props) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>(item?.type ?? "video_link");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [tagsInput, setTagsInput] = useState(item?.tags?.join(", ") ?? "");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const data = { type, title, description, url, tags };
    const result = item
      ? await updateContentAction(item.id, data)
      : await createContentAction(data);

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
            <DialogTitle>{item ? "ویرایش محتوا" : "محتوای جدید"}</DialogTitle>
            <DialogDescription>
              ویدیو، مستند یا تصویر برای تخصیص به مخاطبان
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>نوع</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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
              <Label>توضیحات</Label>
              <Textarea
                dir="rtl"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>آدرس لینک</Label>
              <Input
                dir="ltr"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>برچسب‌ها (با کاما جدا کنید)</Label>
              <Input
                dir="rtl"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="آموزش, محصول, ویدیو"
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
