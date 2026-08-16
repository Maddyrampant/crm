import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { hasAiConfigured } from "@/lib/ai/provider";
import { listConversations, listPendingToolRuns } from "@/services/ai";
import { ChatPanel } from "@/components/assistant/chat-panel";
import { AssistantNotice } from "@/components/assistant/assistant-notice";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "دستیار هوش مصنوعی" };

export default async function AssistantPage() {
  const { workspaceId, user } = await requireWorkspace();
  const [conversations, pendingRuns] = await Promise.all([
    listConversations(workspaceId, user.id),
    listPendingToolRuns(workspaceId),
  ]);
  const configured = hasAiConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="دستیار هوش مصنوعی"
        description="سؤال بپرسید، گزارش بگیرید یا درخواست ساخت مخاطب و تسک بدهید"
      />
      {!configured && <AssistantNotice />}
      <ChatPanel
        conversations={conversations}
        pendingRuns={pendingRuns}
        disabled={!configured}
      />
    </div>
  );
}
