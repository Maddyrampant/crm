"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ListChecks, GripVertical, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { deletePlaybookAction } from "@/actions/sales-playbook";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlaybookFormDialog } from "./playbook-form-dialog";
import type { SalesPlaybook } from "@/db/schema";

type Props = {
  initialPlaybooks: SalesPlaybook[];
  canManage: boolean;
};

export function PlaybookManager({ initialPlaybooks, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [playbooks, setPlaybooks] = useState(initialPlaybooks);
  const [formOpen, setFormOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این لیست پخش اطمینان دارید؟")) return;
    const result = await deletePlaybookAction(id);
    if (result.ok) {
      toast.success("لیست پخش حذف شد");
      setPlaybooks((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <>
      {playbooks.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={ListChecks} title="هنوز لیست پخشی ایجاد نشده" description="لیست پخش استاندارد فروش خود را بسازید.">
              {canManage && (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  لیست پخش جدید
                </Button>
              )}
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((p) => {
            const steps = (p.steps as Array<{ title: string; description?: string }>) ?? [];
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  {canManage && (
                    <Button size="icon" variant="ghost" title="حذف" disabled={isPending} onClick={() => handleDelete(p.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4 text-muted-foreground" />
                        <span>{step.title}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PlaybookFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={() => { setFormOpen(false); router.refresh(); }} />
    </>
  );
}
