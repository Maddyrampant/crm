import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { StalledDeal } from "@/services/forecast";

type Props = {
  deals: StalledDeal[];
};

export function StalledDealsTable({ deals }: Props) {
  if (deals.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="فروش متوقفی نیست"
        description="همه فروش‌ها در حال پیگیری هستند."
      />
    );
  }

  return (
    <div className="space-y-2">
      {deals.map((d) => (
        <Link
          key={d.dealId}
          href={`/pipeline/deals/${d.dealId}`}
          className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{d.title}</p>
            <p className="text-xs text-muted-foreground">{d.stageName}</p>
          </div>
          <div className="shrink-0 text-end">
            <p className="font-medium tabular-nums">
              {formatCurrency(d.amount)}
            </p>
            <Badge
              variant={d.daysSinceUpdate > 30 ? "destructive" : "secondary"}
              className="mt-1"
            >
              {formatNumber(d.daysSinceUpdate)} روز
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
