"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createIntegrationAction } from "@/actions/messenger-integrations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const channelPlaceholders: Record<string, string> = {
  whatsapp: 'مثال: {"phone":"09911234567","token":"API_KEY","template":"..."}',
  telegram: 'مثال: {"botToken":"123456:ABC-DEF...","chatId":"@my_channel"}',
  instagram: 'مثال: {"username":"my_account","accessToken":"IGAA..."}',
  other: "config دلخواه به صورت JSON",
};

export function MessengerConnectForm({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [channel, setChannel] = useState("whatsapp");
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const configRaw = fd.get("config") as string;
    let config: Record<string, unknown> | undefined;
    if (configRaw && configRaw.trim()) {
      try {
        config = JSON.parse(configRaw);
      } catch {
        toast.error("config باید یک JSON معتبر باشد");
        return;
      }
    }

    startTransition(async () => {
      const res = await createIntegrationAction({
        channel: channel as "whatsapp" | "telegram" | "instagram" | "other",
        name: name || channel,
        config,
      });
      if (res.ok) {
        toast.success("اتصال با موفقیت ثبت شد");
        onOpenChange(false);
        setChannel("whatsapp");
        setName("");
        router.refresh();
      } else {
        toast.error("خطا در ثبت اتصال");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>اتصال پیام‌رسان جدید</DialogTitle>
          <DialogDescription>
            اطلاعات اتصال واتساپ، تلگرام یا اینستاگرام را وارد کنید. پس از ثبت،
            Webhook URL از کارت اتصال قابل کپی است.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-ch">کانال</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger id="m-ch">
                <SelectValue placeholder="انتخاب کانال" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">واتساپ</SelectItem>
                <SelectItem value="telegram">تلگرام</SelectItem>
                <SelectItem value="instagram">اینستاگرام</SelectItem>
                <SelectItem value="other">سایر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-name">نام اتصال</Label>
            <Input
              id="m-name"
              name="name"
              placeholder="مثلاً ربات پشتیبانی من"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-config">پیکربندی (JSON اختیاری)</Label>
            <Textarea
              id="m-config"
              name="config"
              dir="ltr"
              rows={3}
              placeholder={channelPlaceholders[channel]}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              توکن، نام کاربری و سایر تنظیمات هر کانال را اینجا وارد کنید.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : null}
              ثبت اتصال
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
