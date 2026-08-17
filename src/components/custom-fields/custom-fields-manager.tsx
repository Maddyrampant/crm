"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Settings2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteFieldAction } from "@/actions/custom-fields";
import { FieldForm } from "./field-form";
import type { CustomFieldDef } from "@/services/custom-fields";

type Props = {
  initialData: CustomFieldDef[];
};

const ENTITY_TABS = [
  { value: "contact", label: "مخاطبین" },
  { value: "company", label: "شرکت‌ها" },
  { value: "deal", label: "فروش‌ها" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  text: "متن",
  number: "عدد",
  select: "انتخابی",
  date: "تاریخ",
  boolean: "بله/خیر",
  multiselect: "چند انتخابی",
};

export function CustomFieldsManager({ initialData }: Props) {
  const [fields, setFields] = useState<CustomFieldDef[]>(initialData);
  const [activeTab, setActiveTab] = useState<string>("contact");
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const entityFields = fields.filter((f) => f.entity === activeTab);

  function handleCreated(field: CustomFieldDef) {
    setFields((prev) => [...prev, field]);
    setFormOpen(false);
    router.refresh();
  }

  async function handleDelete(field: CustomFieldDef) {
    if (!confirm(`فیلد «${field.name}» حذف شود؟`)) return;
    setDeletingId(field.id);
    const result = await deleteFieldAction(field.id);
    setDeletingId(null);
    if (result.ok) {
      toast.success("فیلد حذف شد");
      setFields((prev) => prev.filter((f) => f.id !== field.id));
      router.refresh();
    } else {
      toast.error("خطا در حذف فیلد");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">مدیریت فیلدها</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              {ENTITY_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              افزودن فیلد
            </Button>
          </div>

          {ENTITY_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {fields.filter((f) => f.entity === tab.value).length === 0 ? (
                <EmptyState
                  icon={Settings2}
                  title="فیلد سفارشی وجود ندارد"
                  description="برای شروع، فیلد جدیدی اضافه کنید."
                />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام</TableHead>
                        <TableHead>نوع</TableHead>
                        <TableHead>الزامی</TableHead>
                        <TableHead>گزینه‌ها</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields
                        .filter((f) => f.entity === tab.value)
                        .map((field) => (
                          <TableRow key={field.id}>
                            <TableCell className="font-medium">
                              {field.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {TYPE_LABELS[field.type] ?? field.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {field.required ? "بله" : "خیر"}
                            </TableCell>
                            <TableCell>
                              {field.options && field.options.length > 0
                                ? field.options.join("، ")
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon-xs"
                                variant="destructive"
                                disabled={deletingId === field.id}
                                onClick={() => handleDelete(field)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <FieldForm
          entity={activeTab}
          open={formOpen}
          onOpenChange={setFormOpen}
          onCreated={handleCreated}
        />
      </CardContent>
    </Card>
  );
}
