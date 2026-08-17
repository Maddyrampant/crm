import { toFaDigits, formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";

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
  if (!data.length) {
    return (
      <EmptyState
        icon={Users}
        title="داده‌ای موجود نیست"
        description="هنوز اطلاعات عملکرد تیم ثبت نشده است."
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>نام</TableHead>
            <TableHead>برنده</TableHead>
            <TableHead>ارزش برنده</TableHead>
            <TableHead>باز</TableHead>
            <TableHead>ارزش باز</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((member) => (
            <TableRow key={member.userId ?? Math.random()}>
              <TableCell className="font-medium">{member.userName ?? "—"}</TableCell>
              <TableCell>{toFaDigits(member.wonCount)}</TableCell>
              <TableCell>{formatCurrency(member.wonValue)}</TableCell>
              <TableCell>{toFaDigits(member.openCount)}</TableCell>
              <TableCell>{formatCurrency(member.openValue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
