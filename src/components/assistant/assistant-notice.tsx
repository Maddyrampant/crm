import { Sparkles } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AssistantNotice() {
  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-amber-600" />
          پیکربندی ارائه‌دهنده مدل
        </CardTitle>
        <CardDescription>
          برای فعال‌سازی دستیار، یکی از متغیرهای
          <code className="mx-1 rounded bg-muted px-1 font-mono text-xs">OPENROUTER_API_KEY</code> یا
          <code className="mx-1 rounded bg-muted px-1 font-mono text-xs">ANTHROPIC_API_KEY</code> را در
          <code className="mx-1 rounded bg-muted px-1 font-mono text-xs">.env.local</code> تنظیم کنید.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
