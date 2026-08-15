import { requireWorkspace, hasPermission } from "@/lib/session";
import { getKanbanBoard } from "@/services/deals";
import { listPipelines } from "@/services/pipelines";
import { listContacts } from "@/services/contacts";
import { getWorkspaceMembers } from "@/services/workspace";
import { toKanbanBoardRow, toPipelineRow } from "@/lib/serialize";
import { KanbanBoard } from "@/components/pipeline/kanban-board";

export default async function PipelinePage() {
  const { workspaceId, membership } = await requireWorkspace();

  const [board, pipelines, contactsResult, members] = await Promise.all([
    getKanbanBoard(workspaceId),
    listPipelines(workspaceId),
    listContacts({ workspaceId, pageSize: 200, sortBy: "firstName", sortDir: "asc" }),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <KanbanBoard
      initialBoard={toKanbanBoardRow(board)}
      initialPipelines={pipelines.map(toPipelineRow)}
      contacts={contactsResult.items.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      }))}
      members={members}
      canManageDeal={hasPermission(membership, "seller")}
      canManagePipeline={hasPermission(membership, "manager")}
    />
  );
}
