"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
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
import { formatDateTime, toFaDigits } from "@/lib/format";
import {
  BOOKING_DURATIONS,
  type BookingDuration,
  type BookingLinkInput,
} from "@/lib/bookings";
import {
  createBookingLinkAction,
  deleteBookingLinkAction,
  toggleBookingLinkAction,
} from "@/actions/bookings";

type BookingLinkRow = {
  id: string;
  title: string;
  slug: string;
  userId: string;
  userName: string | null;
  durationMinutes: number;
  location: string | null;
  active: boolean;
  createdAt: Date;
};

type Props = {
  links: BookingLinkRow[];
};

const DURATION_LABELS: Record<number, string> = {
  15: "۱۵ دقیقه",
  30: "۳۰ دقیقه",
  45: "۴۵ دقیقه",
  60: "۶۰ دقیقه",
};

function getPublicUrl(slug: string): string {
  if (typeof window === "undefined") return `/s/${slug}`;
  return `${window.location.origin}/s/${slug}`;
}

export function BookingLinksPanel({ links }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<BookingDuration>(30);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const filteredLinks = links.filter((l) => {
    const matchesSearch = !searchInput ||
      l.title.toLowerCase().includes(searchInput.toLowerCase()) ||
      l.slug.toLowerCase().includes(searchInput.toLowerCase());
    const matchesActive = activeFilter === "all" ||
      (activeFilter === "active" && l.active) ||
      (activeFilter === "inactive" && !l.active);
    return matchesSearch && matchesActive;
  });

  function resetForm() {
    setTitle("");
    setDuration(30);
    setLocation("");
    setDescription("");
    setSlug("");
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleCopy(link: BookingLinkRow) {
    const url = getPublicUrl(link.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      toast.success("لینک کپی شد");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("خطا در کپی لینک");
    }
  }

  async function handleToggle(link: BookingLinkRow, active: boolean) {
    if (busyId) return;
    setBusyId(link.id);
    const result = await toggleBookingLinkAction(link.id, active);
    setBusyId(null);
    if (!result.ok) {
      toast.error("خطا در تغییر وضعیت");
      return;
    }
    router.refresh();
  }

  async function handleDelete(link: BookingLinkRow) {
    if (busyId) return;
    if (!confirm(`لینک «${link.title}» حذف شود؟`)) return;
    setBusyId(link.id);
    const result = await deleteBookingLinkAction(link.id);
    setBusyId(null);
    if (!result.ok) {
      toast.error("خطا در حذف لینک");
      return;
    }
    toast.success("لینک حذف شد");
    router.refresh();
  }

  async function handleSave() {
    if (saving) return;
    if (!title.trim()) {
      toast.error("عنوان الزامی است");
      return;
    }
    setSaving(true);
    const input: BookingLinkInput = {
      title: title.trim(),
      userId: "",
      durationMinutes: duration,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      slug: slug.trim() || undefined,
    };
    const result = await createBookingLinkAction(input);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error ?? "خطا در ایجاد لینک");
      return;
    }
    toast.success("لینک ساخته شد");
    setDialogOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <>
      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <p className="font-medium">لینک‌های رزرو</p>
            <p className="text-xs text-muted-foreground">
              {toFaDigits(links.length)} لینک فعال
            </p>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4" />
            لینک جدید
          </Button>
        </div>
        <div className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                dir="rtl"
                className="ps-8"
                placeholder="جستجوی عنوان یا slug..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={activeFilter}
              onValueChange={setActiveFilter}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredLinks.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="لینکی ثبت نشده"
              description="اولین لینک رزرو را بسازید تا مشتریان بتوانند جلسه رزرو کنند."
              className="py-8"
            />
          ) : (
            <ul className="space-y-3">
              {filteredLinks.map((link) => (
                <li key={link.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{link.title}</p>
                        <Badge variant="secondary">
                          {DURATION_LABELS[link.durationMinutes] ??
                            `${toFaDigits(link.durationMinutes)} دقیقه`}
                        </Badge>
                        {!link.active && (
                          <Badge variant="outline">غیرفعال</Badge>
                        )}
                      </div>
                      {link.userName && (
                        <p className="text-xs text-muted-foreground">
                          {link.userName}
                        </p>
                      )}
                      {link.location && (
                        <p className="text-xs text-muted-foreground">
                          {link.location}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px]">
                          /s/{link.slug}
                        </span>
                        <span>·</span>
                        <span>{formatDateTime(link.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={link.active}
                        disabled={busyId === link.id}
                        onCheckedChange={(c) => handleToggle(link, c)}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={busyId === link.id}
                        onClick={() => handleCopy(link)}
                      >
                        {copiedId === link.id ? (
                          <Check className="size-4 text-green-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        disabled={busyId === link.id}
                        onClick={() => handleDelete(link)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>لینک رزرو جدید</DialogTitle>
            <DialogDescription>
              لینک عمومی برای رزرو جلسه با مشتریان — مشتری زمان خالی را انتخاب
              و رزرو میکند.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">عنوان</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: جلسه مشاوره فروش"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                مدت جلسه
              </Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v) as BookingDuration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {DURATION_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                مکان (اختیاری)
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثلاً: اتاق جلسه یا لینک آنلاین"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                توضیحات (اختیاری)
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کوتاه درباره جلسه"
                rows={2}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                سفارشی‌سازی لینک (اختیاری)
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">/s/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="خودکار اگر خالی باشد"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "ساخت لینک"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
