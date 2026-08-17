"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { listGoalsAction, deleteGoalAction, getGoalProgressAction } from "@/actions/goals";
import { formatCurrency, formatDateTime, toFaDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GoalFormDialog } from "./goal-form";
import { GoalProgress } from "./goal-progress";

type GoalRow = { goal: { id: string; userId: string; period: string; targetAmount: string; startDate: string; endDate: string; createdAt: Date }; userName: string | null };

type Member = { id: string; name: string | null };

type Props = {
  initialGoals: GoalRow[];
  members: Member[];
  canManage: boolean;
};

const periodLabels: Record<string, string> = {
  monthly: "ماهانه",
  quarterly: "فصلی",
  yearly: "سالانه",
};

export function GoalsManager({ initialGoals, members, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goals, setGoals] = useState(initialGoals);
  const [formOpen, setFormOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<
    Record<string, { target: number; achieved: number; percentage: number }>
  >({});

  async function handleRefresh() {
    startTransition(async () => {
      const res = await listGoalsAction();
      if (res.ok) setGoals(res.data);
      router.refresh();
    });
  }

  async function loadProgress(id: string) {
    if (progressMap[id]) return;
    const res = await getGoalProgressAction(id);
    if (res.ok && res.data) {
      setProgressMap((prev) => ({
        ...prev,
        [id]: {
          target: res.data!.targetAmount,
          achieved: res.data!.achieved,
          percentage: res.data!.percentage,
        },
      }));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این هدف اطمینان دارید؟")) return;
    const result = await deleteGoalAction(id);
    if (result.ok) {
      toast.success("هدف حذف شد");
      setGoals((prev) => prev.filter((g) => g.goal.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف هدف");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">اهداف فروش</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
              disabled={isPending}
            >
              <Plus className="size-4" />
              هدف جدید
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="هنوز هدفی تعریف نشده"
              description="اولین هدف فروش خود را بسازید."
            >
              {canManage && (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  هدف جدید
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>کاربر</TableHead>
                    <TableHead>دوره</TableHead>
                    <TableHead>مبلغ هدف</TableHead>
                    <TableHead>تاریخ شروع</TableHead>
                    <TableHead>تاریخ پایان</TableHead>
                    <TableHead>پیشرفت</TableHead>
                    <TableHead>تاریخ ایجاد</TableHead>
                    {canManage && <TableHead className="text-left">عملیات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((g) => {
                    const goal = g.goal;
                    const prog = progressMap[goal.id];
                    if (!prog) loadProgress(goal.id);
                    return (
                      <TableRow key={goal.id}>
                        <TableCell className="font-medium">
                          {g.userName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {periodLabels[goal.period] ?? goal.period}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(Number(goal.targetAmount))}
                        </TableCell>
                        <TableCell>{toFaDigits(goal.startDate)}</TableCell>
                        <TableCell>{toFaDigits(goal.endDate)}</TableCell>
                        <TableCell className="min-w-[160px]">
                          {prog ? (
                            <GoalProgress percentage={prog.percentage} />
                          ) : (
                            <span className="text-xs text-muted-foreground">...</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(goal.createdAt)}</TableCell>
                        {canManage && (
                          <TableCell className="text-left">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="حذف"
                                disabled={isPending}
                                onClick={() => handleDelete(goal.id)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        members={members}
        onSaved={() => {
          setFormOpen(false);
          handleRefresh();
        }}
      />
    </>
  );
}
