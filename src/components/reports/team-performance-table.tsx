"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Trophy, Target } from "lucide-react";

type TeamMember = {
  userId: string | null;
  userName: string | null;
  wonCount: number;
  wonValue: number;
  openCount: number;
  openValue: number;
};

type Props = {
  data: TeamMember[];
};

export function TeamPerformanceTable({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.wonValue - a.wonValue);
  const totalWon = sorted.reduce((s, r) => s + r.wonValue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" />
          عملکرد تیم فروش
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            داده‌ای برای نمایش نیست
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>فروشنده</TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      برنده
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center gap-1">
                      <Target className="h-3 w-3 text-blue-500" />
                      باز
                    </span>
                  </TableHead>
                  <TableHead>ارزش برنده‌شده</TableHead>
                  <TableHead>ارزش باز</TableHead>
                  <TableHead>سهم از کل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, i) => {
                  const share =
                    totalWon > 0
                      ? Math.round((row.wonValue / totalWon) * 100)
                      : 0;
                  return (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.userName ?? "ناشناس"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{row.wonCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{row.openCount}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(row.wonValue)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatCurrency(row.openValue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums">{share}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
