import { cn } from "@/lib/utils";
import { toFaDigits } from "@/lib/format";

type Props = {
  percentage: number;
};

export function GoalProgress({ percentage }: Props) {
  const color =
    percentage < 30
      ? "bg-red-500"
      : percentage <= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {toFaDigits(percentage)}٪
      </span>
    </div>
  );
}
