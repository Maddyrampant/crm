"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { deleteFieldAction } from "@/actions/custom-fields";

type Field = {
  id: string;
  entity: string;
  name: string;
  type: string;
  options: string[] | null;
  required: boolean;
  orderIndex: number;
};

const entityLabels: Record<string, string> = {
  contact: "مخاطب",
  company: "شرکت",
  deal: "فروش",
};

const typeLabels: Record<string, string> = {
  text: "متن",
  number: "عدد",
  date: "تاریخ",
  select: "انتخابی",
  multiselect: "چندانتخابی",
  boolean: "بله/خیر",
};

type Props = {
  fields: Field[];
  onRefresh: () => void;
};

export function FieldList({ fields, onRefresh }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (!confirm(`آیا از حذف فیلد «${name}» اطمینان دارید؟`)) return;
    startTransition(async () => {
      const res = await deleteFieldAction(id);
      if (res.ok) {
        toast.success("فیلد حذف شد");
        onRefresh();
      } else {
        toast.error("خطا در حذف فیلد");
      }
    });
  }

  const grouped = fields.reduce(
    (acc, f) => {
      (acc[f.entity] ??= []).push(f);
      return acc;
    },
    {} as Record<string, Field[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([entity, entityFields]) => (
        <div key={entity}>
          <h3 className="mb-3 text-lg font-semibold">{entityLabels[entity] ?? entity}</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>گزینه‌ها</TableHead>
                  <TableHead>الزامی</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityFields.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeLabels[f.type] ?? f.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {f.options?.length ? f.options.join(", ") : "—"}
                    </TableCell>
                    <TableCell>{f.required ? "✓" : "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleDelete(f.id, f.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {entityFields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      فیلد سفارشی تعریف نشده
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
