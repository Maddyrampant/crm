"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { FieldList } from "@/components/custom-fields/field-list";
import { FieldForm } from "@/components/custom-fields/field-form";

type Field = {
  id: string;
  entity: string;
  name: string;
  type: string;
  options: string[] | null;
  required: boolean;
  orderIndex: number;
};

type Props = {
  fields: Field[];
};

export function CustomFieldsPanel({ fields }: Props) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);

  return (
    <div className="space-y-6">
      <FieldForm onCreated={refresh} />
      <FieldList fields={fields} onRefresh={refresh} />
    </div>
  );
}
