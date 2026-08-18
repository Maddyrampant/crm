"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { connectWooStore, testWooConnection } from "@/actions/woocommerce";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WooConnectForm({ open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await connectWooStore({
        name: fd.get("name") as string,
        url: fd.get("url") as string,
        consumerKey: fd.get("consumerKey") as string,
        consumerSecret: fd.get("consumerSecret") as string,
        webhookSecret: fd.get("webhookSecret") as string,
      });

      if (res.ok) {
        toast.success("فروشگاه با موفقیت متصل شد");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  async function handleTest() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);

    const url = fd.get("url") as string;
    const key = fd.get("consumerKey") as string;
    const secret = fd.get("consumerSecret") as string;

    if (!url || !key || !secret) {
      toast.error("آدرس، Consumer Key و Consumer Secret را وارد کنید");
      return;
    }

    setTesting(true);
    const res = await testWooConnection(url, key, secret);
    setTesting(false);

    if (res.ok) {
      toast.success("اتصال برقرار شد");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>اتصال فروشگاه ووکامرس</DialogTitle>
          <DialogDescription>
            اطلاعات فروشگاه خود را وارد کنید. پس از اتصال، Webhook URL نمایش داده می‌شود.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="woo-name">نام فروشگاه</Label>
            <Input id="woo-name" name="name" placeholder="فروشگاه من" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="woo-url">آدرس فروشگاه</Label>
            <Input
              id="woo-url"
              name="url"
              dir="ltr"
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="woo-key">Consumer Key</Label>
              <Input id="woo-key" name="consumerKey" dir="ltr" placeholder="ck_xxxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="woo-secret">Consumer Secret</Label>
              <Input id="woo-secret" name="consumerSecret" dir="ltr" placeholder="cs_xxxx" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="woo-webhook-secret">Webhook Secret</Label>
            <Input
              id="woo-webhook-secret"
              name="webhookSecret"
              dir="ltr"
              placeholder="随机字符串"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="ml-1 h-4 w-4" />
              )}
              تست اتصال
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : null}
              اتصال
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
