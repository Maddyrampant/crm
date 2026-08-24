"use client";

import { useRouter } from "next/navigation";
import { DealFormDialog } from "@/components/pipeline/deal-form-dialog";
import type { DealRow, PipelineRow } from "@/lib/api-types";
import type { WorkspaceMemberRow } from "@/services/workspace";

type Props = {
  pipelines: PipelineRow[];
  contacts: { id: string; name: string }[];
  members: WorkspaceMemberRow[];
};

export function DealNewClient({ pipelines, contacts, members }: Props) {
  const router = useRouter();

  return (
    <DealFormDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) router.push("/pipeline/deals");
      }}
      pipelines={pipelines}
      contacts={contacts}
      members={members}
      onSaved={(deal: DealRow) => {
        router.push(`/pipeline/deals/${deal.id}`);
      }}
    />
  );
}
