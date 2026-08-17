"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { auditLogs } from "@/db/schema";

type LogRow = typeof auditLogs.$inferSelect;

type Props = {
  initialLogs: LogRow[];
};

const entityLabels: Record<string, string> = {
  contact: "مخاطب",
  company: "شرکت",
  deal: "فروش",
  invoice: "فاکتور",
};

const actionLabels: Record<string, string> = {
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  send: "ارسال",
};

const entityTypes = ["contact", "company", "deal", "invoice"];

export function AuditLogTable({ initialLogs }: Props) {
  const [logs] = useState(initialLogs);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState<
    Record<string, { old: unknown; new: unknown }> | null
  >(null);

  const filtered =
    entityFilter === "all"
      ? logs
      : logs.filter((l) => l.entity === entityFilter);

  function showChanges(changes: Record<string, { old: unknown; new: unknown }> | null) {
    setSelectedChanges(changes);
    setDetailOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">تاریخچه تغییرات</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه موجودیت‌ها</SelectItem>
                {entityTypes.map((e) => (
                  <SelectItem key={e} value={e}>
                    {entityLabels[e] ?? e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="لاگی یافت نشد"
              description="هنوز تغییری ثبت نشده است."
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>موجودیت</TableHead>
                    <TableHead>عملیات</TableHead>
                    <TableHead>شناسه</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead className="text-left">تغییرات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {entityLabels[log.entity] ?? log.entity}
                      </TableCell>
                      <TableCell>
                        {actionLabels[log.action] ?? log.action}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityId.slice(0, 8)}
                      </TableCell>
                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell className="text-left">
                        {log.changes ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => showChanges(log.changes)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>جزئیات تغییرات</DialogTitle>
          </DialogHeader>
          {selectedChanges ? (
            <pre className="overflow-auto max-h-[400px] rounded-lg bg-muted p-4 text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(selectedChanges, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">تغییری ثبت نشده.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
