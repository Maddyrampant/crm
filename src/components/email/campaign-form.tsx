"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createCampaignAction } from "@/actions/email-campaign";
import { getContactsAction } from "@/actions/contacts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ContactOption = { id: string; firstName: string; lastName: string | null; email: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function CampaignFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (!open) return;
    if (recipientType === "specific") {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingContacts(true);
      getContactsAction({ pageSize: 100 })
        .then((res) => {
          if (!controller.signal.aborted && res.ok && res.data) setContacts(res.data.items);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingContacts(false);
        });
    }
    return () => { abortRef.current?.abort(); };
  }, [open, recipientType]);

  function reset() {
    setName("");
    setSubject("");
    setHtmlBody("");
    setRecipientType("all");
    setRecipientIds([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await createCampaignAction({
      name,
      subject,
      htmlBody,
      recipientType,
      recipientIds: recipientType === "specific" ? recipientIds : undefined,
    });

    setSaving(false);

    if (!result.ok || !result.data) {
      toast.error("خطا در ایجاد کمپین");
      return;
    }

    toast.success("کمپین جدید ایجاد شد");
    reset();
    onSaved();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>کمپین ایمیلی جدید</DialogTitle>
          <DialogDescription>
            اطلاعات کمپین ایمیلی را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cmp-name">نام کمپین *</Label>
              <Input
                id="cmp-name"
                dir="rtl"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً خوشامدگویی"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cmp-subject">موضوع ایمیل *</Label>
              <Input
                id="cmp-subject"
                dir="rtl"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع ایمیل..."
              />
            </div>

            <div className="grid gap-2">
              <Label>نوع دریافت‌کنندگان</Label>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه مشتریان</SelectItem>
                  <SelectItem value="specific">مشتریان خاص</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === "specific" && (
              <div className="grid gap-2">
                <Label>انتخاب مشتریان</Label>
                {loadingContacts ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    در حال بارگذاری...
                  </div>
                ) : (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {contacts.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        مشتری‌ای یافت نشد.
                      </p>
                    ) : (
                      contacts.map((c) => {
                        const label =
                          `${c.firstName} ${c.lastName ?? ""}`.trim();
                        return (
                          <label
                            key={c.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={recipientIds.includes(c.id)}
                              onChange={(e) =>
                                setRecipientIds((prev) =>
                                  e.target.checked
                                    ? [...prev, c.id]
                                    : prev.filter((id) => id !== c.id)
                                )
                              }
                            />
                            <span>{label}</span>
                            {c.email && (
                              <span className="text-xs text-muted-foreground" dir="ltr">
                                ({c.email})
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="cmp-body">محتوای ایمیل *</Label>
              <Textarea
                id="cmp-body"
                dir="rtl"
                rows={8}
                required
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                placeholder="محتوای HTML ایمیل..."
              />
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            ایجاد کمپین
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
