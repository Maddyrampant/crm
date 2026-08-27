"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";
import { deleteTerritoryAction } from "@/actions/territories";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TerritoryFormDialog } from "./territory-form-dialog";
import type { Territory } from "@/db/schema";

type Props = {
  initialTerritories: Territory[];
  canManage: boolean;
};

export function TerritoryManager({ initialTerritories, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [territories, setTerritories] = useState(initialTerritories);
  const [formOpen, setFormOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این سرزمین اطمینان دارید؟")) return;
    const result = await deleteTerritoryAction(id);
    if (result.ok) {
      toast.success("سرزمین حذف شد");
      setTerritories((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <>
      {territories.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={MapPin} title="هنوز سرزمینی تعریف نشده" description="سرزمین‌های جغرافیایی خود را تعریف کنید.">
              {canManage && (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  سرزمین جدید
                </Button>
              )}
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {territories.map((t) => {
            const rules = (t.rules as Array<{ field: string; operator: string; value: string }>) ?? [];
            return (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="size-4 text-blue-600" />
                    {t.name}
                  </CardTitle>
                  {canManage && (
                    <Button size="icon" variant="ghost" title="حذف" disabled={isPending} onClick={() => handleDelete(t.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {rules.length > 0 ? (
                    <div className="space-y-1">
                      {rules.map((r, i) => (
                        <p key={i} className="text-sm text-muted-foreground">
                          {r.field} {r.operator} {r.value}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">بدون قاعده</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TerritoryFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={() => { setFormOpen(false); router.refresh(); }} />
    </>
  );
}
