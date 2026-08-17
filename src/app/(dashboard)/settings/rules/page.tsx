import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { listRules, listRuleLogs } from "@/services/rules";
import { listPipelines } from "@/services/pipelines";
import { PageHeader } from "@/components/ui/page-header";
import { RulesPanel } from "@/components/rules/rules-panel";

export const metadata: Metadata = { title: "قوانین اتوماسیون" };

export default async function RulesPage() {
  const { workspaceId } = await requireWorkspaceRole("manager");

  const [rulesResult, logsResult, pipelines] = await Promise.all([
    listRules(workspaceId),
    listRuleLogs(workspaceId),
    listPipelines(workspaceId),
  ]);

  const stages = pipelines.flatMap((p) =>
    p.stages.map((s) => ({ id: s.id, name: s.name, pipelineName: p.name }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="قوانین اتوماسیون"
        description="رویدادها، شرایط و اکشن‌های خودکار — انجین قوانین (Workflow/Blueprint)"
      />
      <RulesPanel rules={rulesResult.items} logs={logsResult.items} stages={stages} />
    </div>
  );
}
