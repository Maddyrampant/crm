import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listAppointments } from "@/services/appointments";
import { listTasks } from "@/services/tasks";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CalendarView } from "@/components/calendar/calendar-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "تقویم و قرارها" };

export default async function CalendarPage() {
  const { workspaceId } = await requireWorkspace();
  const [appointments, tasks, customers] = await Promise.all([
    listAppointments(workspaceId),
    listTasks(workspaceId),
    db
      .select({ id: contacts.id, name: contacts.firstName })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId))
      .orderBy(contacts.firstName),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقویم و قرارها"
        description="مدیریت قرار ملاقات و وظایف"
      />
      <CalendarView
        appointments={appointments}
        tasks={tasks}
        customers={customers}
      />
    </div>
  );
}
