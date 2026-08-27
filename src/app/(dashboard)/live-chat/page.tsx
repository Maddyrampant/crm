import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listSessionsAction } from "@/actions/live-chat";
import { PageHeader } from "@/components/ui/page-header";
import { LiveChatManager } from "@/components/live-chat/live-chat-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "چت زنده" };

export default async function LiveChatPage() {
  const { membership } = await requireWorkspace();
  const result = await listSessionsAction();
  const sessions = result.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="چت زنده وب‌سایت"
        description="مدیریت مکالمات چت زنده با بازدیدکنندگان سایت."
      />
      <LiveChatManager
        initialSessions={sessions}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
