"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { bookSlotAction } from "@/actions/bookings";
import type { BookingSlot } from "@/lib/bookings";

type Props = {
  slug: string;
  slots: BookingSlot[];
  durationMinutes: number;
};

export function BookingForm({ slug, slots, durationMinutes }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    title: string;
    startsAt: string;
    hostName: string;
  } | null>(null);

  async function handleSubmit() {
    if (!selectedSlot || !guestName.trim() || !guestEmail.trim()) {
      toast.error("لطفاً نام، ایمیل و زمان را انتخاب کنید");
      return;
    }
    setSubmitting(true);
    try {
      const result = await bookSlotAction(slug, {
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim() || undefined,
          startsAt: selectedSlot,
          notes: notes.trim() || undefined,
        });
      if (!result.ok || !result.data) {
        toast.error(result.error ?? "خطا در رزرو");
        setSubmitting(false);
        return;
      }
      setDone({
        title: result.data.title,
        startsAt: new Date(result.data.startsAt).toLocaleDateString("fa-IR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        hostName: result.data.hostName ?? "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در رزرو");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-emerald-50 p-6 text-center dark:bg-emerald-950/20">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-600" />
        <h2 className="mb-1 text-lg font-bold">رزرو ثبت شد!</h2>
        <p className="text-sm text-muted-foreground">
          {done.title} با {done.hostName}
        </p>
        <p className="text-sm font-medium">{done.startsAt}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          ایمیل تایید به {guestEmail} ارسال خواهد شد.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold">زمانهای موجود ({durationMinutes} دقیقه)</h2>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            در ۱۴ روز آینده زمان خالی موجود نیست.
          </p>
        ) : (
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
            {slots.map((s) => (
              <button
                key={s.startsAt}
                type="button"
                onClick={() => setSelectedSlot(s.startsAt)}
                className={`rounded-md border px-3 py-2 text-right text-xs transition-colors ${
                  selectedSlot === s.startsAt
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                <CalendarDays className="mb-1 size-3.5 opacity-60" />
                <br />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="guest-name">نام *</Label>
          <Input id="guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="نام کامل" />
        </div>
        <div>
          <Label htmlFor="guest-email">ایمیل *</Label>
          <Input id="guest-email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="email@example.com" />
        </div>
        <div>
          <Label htmlFor="guest-phone">تلفن (اختیاری)</Label>
          <Input id="guest-phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="۰۹۱۲..." />
        </div>
        <div>
          <Label htmlFor="guest-notes">توضیحات (اختیاری)</Label>
          <Textarea id="guest-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="موضوع جلسه..." rows={2} />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!selectedSlot || !guestName.trim() || !guestEmail.trim() || submitting}
          className="w-full"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "رزرو کنید"}
        </Button>
      </div>
    </div>
  );
}
