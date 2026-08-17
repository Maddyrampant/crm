"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string | null;
  changes: Record<string, unknown> | null;
  createdAt: Date;
};

const actionLabels: Record<string, string> = {
  create: "ایجاد",
  update: "بروزرسانی",
  delete: "حذف",
};

type Props = {
  logs: AuditLog[];
};

export function AuditLogList({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        لاگ فعالیتی وجود ندارد
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>عملیات</TableHead>
            <TableHead>نهاد</TableHead>
            <TableHead>شناسه</TableHead>
            <TableHead>تغییرات</TableHead>
            <TableHead>تاریخ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <Badge
                  variant={
                    log.action === "delete"
                      ? "destructive"
                      : log.action === "create"
                        ? "default"
                        : "secondary"
                  }
                >
                  {actionLabels[log.action] ?? log.action}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{log.entity}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {log.entityId.slice(0, 8)}...
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                {log.changes ? JSON.stringify(log.changes) : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(log.createdAt).toLocaleDateString("fa-IR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
