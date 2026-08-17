"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Target } from "lucide-react";
import { deleteGoalAction } from "@/actions/goals";

type GoalRow = {
  goal: {
    id: string;
    userId: string;
    period: string;
    targetAmount: string;
    startDate: string;
    endDate: string;
    createdAt: Date;
  };
  userName: string | null;
  progress?: {
    achieved: number;
    count: number;
    percentage: number;
  } | null;
};

const periodLabels: Record<string, string> = {
  monthly: "ماهانه",
  quarterly: "فصلی",
  yearly: "سالانه",
};

type Props = {
  goals: GoalRow[];
  onRefresh: () => void;
};

export function GoalList({ goals, onRefresh }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("آیا از حذف هدف اطمینان دارید؟")) return;
    startTransition(async () => {
      const res = await deleteGoalAction(id);
      if (res.ok) {
        toast.success("هدف حذف شد");
        onRefresh();
      } else {
        toast.error("خطا در حذف");
      }
    });
  }

  if (goals.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        هدف فروشی تعریف نشده
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {goals.map(({ goal, userName, progress }) => (
        <Card key={goal.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{userName ?? "ناشناس"}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleDelete(goal.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">{periodLabels[goal.period] ?? goal.period}</Badge>
              <span className="text-muted-foreground">
                {Number(goal.targetAmount).toLocaleString("fa-IR")} تومان
              </span>
            </div>
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {progress.achieved.toLocaleString("fa-IR")} تومان ({progress.count} فروش)
                  </span>
                  <span className="font-medium">{progress.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {new Date(goal.startDate).toLocaleDateString("fa-IR")} —{" "}
              {new Date(goal.endDate).toLocaleDateString("fa-IR")}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
