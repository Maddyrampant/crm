import { requireWorkspace, hasPermission } from "@/lib/session";
import { getKanbanBoard } from "@/services/deals";
import { listPipelines } from "@/services/pipelines";
import { listContacts } from "@/services/contacts";
import { getWorkspaceMembers } from "@/services/workspace";
import { toKanbanBoardRow, toPipelineRow } from "@/lib/serialize";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { ImportCsvDialog } from "@/components/contacts/import-csv-dialog";

export default async function PipelinePage() {
  const { workspaceId, membership } = await requireWorkspace();

  const [board, pipelines, contactsResult, membersResult] = await Promise.all([
    getKanbanBoard(workspaceId),
    listPipelines(workspaceId),
    listContacts({ workspaceId, pageSize: 200, sortBy: "firstName", sortDir: "asc" }),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="فانل فروش"
        description="فروش‌ها را بین مراحل جابه‌جا کنید و برد/باخت را ثبت کنید."
      >
        {hasPermission(membership, "seller") && <ImportCsvDialog />}
      </PageHeader>
      <KanbanBoard
        initialBoard={toKanbanBoardRow(board)}
        initialPipelines={pipelines.map(toPipelineRow)}
        contacts={contactsResult.items.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
        }))}
        members={membersResult.items}
        canManageDeal={hasPermission(membership, "seller")}
        canManagePipeline={hasPermission(membership, "manager")}
      />
    </div>
  );
}
