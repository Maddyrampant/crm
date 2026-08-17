import { Badge } from "@/components/ui/badge";
import { toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  score: number | null;
};

function getScoreVariant(score: number): "destructive" | "secondary" | "default" {
  if (score <= 30) return "destructive";
  if (score <= 70) return "secondary";
  return "default";
}

export function LeadScoreBadge({ score }: Props) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        —
      </Badge>
    );
  }

  return (
    <Badge
      variant={getScoreVariant(score)}
      className={cn(
        "font-mono",
        score <= 30 && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        score > 30 && score <= 70 && "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
        score > 70 && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
      )}
    >
      {toFaDigits(score)}
    </Badge>
  );
}
