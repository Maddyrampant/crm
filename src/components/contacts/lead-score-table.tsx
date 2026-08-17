"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Zap, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadScoreBadge } from "@/components/contacts/lead-score-badge";
import {
  getContactsAction,
} from "@/actions/contacts";
import {
  calculateLeadScoreAction,
  batchScoreContactsAction,
} from "@/actions/lead-scoring";
import { toFaDigits } from "@/lib/format";
import type { ContactRow } from "@/lib/api-types";

type ContactWithScore = ContactRow & { score: number | null };

type Props = {
  initialData: { items: ContactRow[]; total: number };
};

export function LeadScoreTable({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contacts, setContacts] = useState<ContactWithScore[]>(
    initialData.items.map((c) => ({ ...c, score: null }))
  );
  const [calculatingId, setCalculatingId] = useState<string | null>(null);

  const refreshContacts = useCallback(async () => {
    const result = await getContactsAction({ page: 1, pageSize: 100 });
    if (result.ok && result.data) {
      setContacts(
        result.data.items.map((c: ContactRow) => ({
          ...c,
          score: contacts.find((existing) => existing.id === c.id)?.score ?? null,
        }))
      );
    }
  }, [contacts]);

  useEffect(() => {
    refreshContacts();
  }, []);

  const handleCalculate = useCallback(
    async (contactId: string) => {
      setCalculatingId(contactId);
      try {
        const result = await calculateLeadScoreAction(contactId);
        if (result.ok) {
          setContacts((prev) =>
            prev.map((c) =>
              c.id === contactId ? { ...c, score: result.data.score } : c
            )
          );
          toast.success("امتیاز محاسبه شد");
        } else {
          toast.error("خطا در محاسبه امتیاز");
        }
      } catch {
        toast.error("خطا در محاسبه امتیاز");
      } finally {
        setCalculatingId(null);
      }
    },
    []
  );

  const handleBatchScore = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await batchScoreContactsAction();
        if (result.ok) {
          toast.success(`${toFaDigits(result.data.scored)} مخاطب امتیازدهی شد`);
          await refreshContacts();
          router.refresh();
        } else {
          toast.error("خطا در امتیازدهی گروهی");
        }
      } catch {
        toast.error("خطا در امتیازدهی گروهی");
      }
    });
  }, [refreshContacts, router]);

  if (!contacts.length) {
    return (
      <EmptyState
        icon={Calculator}
        title="مخاطبی یافت نشد"
        description="هنوز مخاطبی در سیستم ثبت نشده است."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {toFaDigits(contacts.length)} مخاطب
        </p>
        <Button
          onClick={handleBatchScore}
          disabled={isPending}
          variant="outline"
          size="sm"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Zap className="size-4" />
          )}
          امتیازدهی همه
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>ایمیل</TableHead>
              <TableHead>مرحله</TableHead>
              <TableHead>امتیاز</TableHead>
              <TableHead className="text-start">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  {contact.firstName} {contact.lastName ?? ""}
                </TableCell>
                <TableCell className="text-muted-foreground" dir="ltr">
                  {contact.email ?? "—"}
                </TableCell>
                <TableCell>
                  {contact.lifecycleStage === "lead"
                    ? "سرنخ"
                    : contact.lifecycleStage === "prospect"
                      ? "مشتری بالقوه"
                      : contact.lifecycleStage === "customer"
                        ? "مشتری"
                        : "غیرفعال"}
                </TableCell>
                <TableCell>
                  <LeadScoreBadge score={contact.score} />
                </TableCell>
                <TableCell className="text-start">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCalculate(contact.id)}
                    disabled={calculatingId === contact.id}
                  >
                    {calculatingId === contact.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Calculator className="size-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
