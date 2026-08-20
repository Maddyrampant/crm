"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MODEL_OPTIONS } from "@/lib/ai/models";
import { setAiSettingsAction } from "@/actions/ai-settings";
import type { AiSettings } from "@/services/workspace-settings";

type Props = {
  settings: AiSettings;
};

export function AiSettingsForm({ settings }: Props) {
  const [loading, setLoading] = useState(false);
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel);
  const [maxSteps, setMaxSteps] = useState(settings.maxSteps);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [systemPromptSuffix, setSystemPromptSuffix] = useState(
    settings.systemPromptSuffix
  );
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    const result = await setAiSettingsAction({
      defaultModel,
      maxSteps,
      temperature,
      systemPromptSuffix,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error ?? "خطا در ذخیره");
      return;
    }
    toast.success("تنظیمات ذخیره شد");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">مدل پیش‌فرض</CardTitle>
          <CardDescription>
            مدلی که به‌صورت پیش‌فرض برای گفتگوهای جدید استفاده می‌شود
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>مدل AI</Label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>حداکثر قدم‌ها (Max Steps): {maxSteps}</Label>
            <Slider
              value={[maxSteps]}
              onValueChange={(v: number[]) => setMaxSteps(v[0])}
              min={1}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              تعداد دفعاتی که AI می‌تواند ابزار فراخوانی کند (بیشتر = پاسخ‌های
              پیچیده‌تر)
            </p>
          </div>

          <div className="space-y-2">
            <Label>دمای خلاقیت (Temperature): {temperature}</Label>
            <Slider
              value={[temperature * 10]}
              onValueChange={(v: number[]) => setTemperature(v[0] / 10)}
              min={0}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              ۰ = دقیق و تکراری، ۱ = خلاقانه‌تر
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">رفتار AI</CardTitle>
          <CardDescription>
            دستورالعمل‌های اضافی برای رفتار دستیار
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>دستورالعمل اضافی سیستم (اختیاری)</Label>
            <Textarea
              dir="rtl"
              rows={4}
              value={systemPromptSuffix}
              onChange={(e) => setSystemPromptSuffix(e.target.value)}
              placeholder="مثال: همیشه با لحن رسمی پاسخ بده. اعداد را با جداکننده هزار بنویس..."
            />
            <p className="text-xs text-muted-foreground">
              متنی که به انتهای پرامپت سیستم اضافه می‌شود و رفتار AI را
              شخصی‌سازی می‌کند
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          <Save className="size-4" />
          ذخیره تنظیمات
        </Button>
      </div>
    </div>
  );
}
