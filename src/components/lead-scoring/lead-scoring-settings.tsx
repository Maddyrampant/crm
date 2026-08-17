"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import {
  calculateLeadScoreAction,
  batchScoreContactsAction,
  updateLeadScoreSettingsAction,
} from "@/actions/lead-scoring";

type Settings = {
  activityWeight: number;
  dealWeight: number;
  invoiceWeight: number;
  recencyDecayDays: number;
  maxScore: number;
};

type Props = {
  settings: Settings;
};

export function LeadScoringSettings({ settings }: Props) {
  const [pending, startTransition] = useTransition();

  function handleBatch() {
    startTransition(async () => {
      const res = await batchScoreContactsAction();
      if (res.ok) {
        toast.success(`${res.data.scored} مخاطب امتیازدهی شد`);
      } else {
        toast.error("خطا در امتیازدهی گروهی");
      }
    });
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateLeadScoreSettingsAction({
        activityWeight: Number(fd.get("activityWeight")),
        dealWeight: Number(fd.get("dealWeight")),
        invoiceWeight: Number(fd.get("invoiceWeight")),
        recencyDecayDays: Number(fd.get("recencyDecayDays")),
        maxScore: Number(fd.get("maxScore")),
      });
      if (res.ok) {
        toast.success("تنظیمات ذخیره شد");
      } else {
        toast.error("خطا در ذخیره");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">امتیازدهی لید</h3>
        <Button onClick={handleBatch} disabled={pending} size="sm">
          <Zap className="ml-2 h-4 w-4" />
          {pending ? "در حال پردازش..." : "امتیازدهی گروهی"}
        </Button>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">وزن‌های امتیازدهی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="activityWeight">وزن فعالیت</Label>
                <Input
                  id="activityWeight"
                  name="activityWeight"
                  type="number"
                  defaultValue={settings.activityWeight}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dealWeight">وزن فروش</Label>
                <Input
                  id="dealWeight"
                  name="dealWeight"
                  type="number"
                  defaultValue={settings.dealWeight}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceWeight">وزن فاکتور</Label>
                <Input
                  id="invoiceWeight"
                  name="invoiceWeight"
                  type="number"
                  defaultValue={settings.invoiceWeight}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recencyDecayDays">روز کاهش تازگی</Label>
                <Input
                  id="recencyDecayDays"
                  name="recencyDecayDays"
                  type="number"
                  defaultValue={settings.recencyDecayDays}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxScore">حداکثر امتیاز</Label>
                <Input
                  id="maxScore"
                  name="maxScore"
                  type="number"
                  defaultValue={settings.maxScore}
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              ذخیره تنظیمات
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
