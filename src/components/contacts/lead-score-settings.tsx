"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";
import {
  getLeadScoreSettingsAction,
  updateLeadScoreSettingsAction,
} from "@/actions/lead-scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Settings = {
  activityWeight: number;
  dealWeight: number;
  invoiceWeight: number;
  recencyDecayDays: number;
  maxScore: number;
};

const DEFAULT_SETTINGS: Settings = {
  activityWeight: 5,
  dealWeight: 10,
  invoiceWeight: 1,
  recencyDecayDays: 90,
  maxScore: 100,
};

export function LeadScoreSettings() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeadScoreSettingsAction().then((res) => {
      if (res.ok) setSettings(res.data);
      setLoading(false);
    });
  }, []);

  function handleChange(key: keyof Settings, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setSettings((prev) => ({ ...prev, [key]: num }));
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateLeadScoreSettingsAction(settings);
      if (result.ok) {
        toast.success("تنظیمات امتیازدهی ذخیره شد");
        router.refresh();
      } else {
        toast.error("خطا در ذخیره تنظیمات");
      }
    });
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تنظیمات امتیازدهی سرنخ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="activityWeight">ضریب فعالیت</Label>
            <Input
              id="activityWeight"
              type="number"
              min={0}
              step={0.5}
              value={settings.activityWeight}
              onChange={(e) => handleChange("activityWeight", e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dealWeight">ضریب معامله</Label>
            <Input
              id="dealWeight"
              type="number"
              min={0}
              step={0.5}
              value={settings.dealWeight}
              onChange={(e) => handleChange("dealWeight", e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceWeight">ضریب فاکتور</Label>
            <Input
              id="invoiceWeight"
              type="number"
              min={0}
              step={0.5}
              value={settings.invoiceWeight}
              onChange={(e) => handleChange("invoiceWeight", e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recencyDecayDays">روزهای کاهش زمانی</Label>
            <Input
              id="recencyDecayDays"
              type="number"
              min={1}
              step={1}
              value={settings.recencyDecayDays}
              onChange={(e) => handleChange("recencyDecayDays", e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxScore">حداکثر امتیاز</Label>
            <Input
              id="maxScore"
              type="number"
              min={1}
              step={1}
              value={settings.maxScore}
              onChange={(e) => handleChange("maxScore", e.target.value)}
              dir="ltr"
            />
          </div>
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isPending}>
            <RotateCcw className="size-4" />
            بازنشانی
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            ذخیره
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
