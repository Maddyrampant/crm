import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listAllVoiceNotesAction } from "@/actions/voice-notes";
import { PageHeader } from "@/components/ui/page-header";
import { VoiceNotesManager } from "@/components/voice-notes/voice-notes-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "یادداشت صوتی" };

export default async function VoiceNotesPage() {
  const { membership } = await requireWorkspace();
  const notes = await listAllVoiceNotesAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="یادداشت‌های صوتی"
        description="ضبط و مدیریت یادداشت‌های صوتی روی مخاطبین و فروش‌ها."
      />
      <VoiceNotesManager
        initialNotes={notes}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
