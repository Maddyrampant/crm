import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationCenterPanel } from "@/components/notifications/notification-center-panel";

export const metadata: Metadata = { title: "مرکز اعلان" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="مرکز اعلان"
        description="همهٔ اعلان‌های شما — وظایف، قرارها، فاکتورها و فرصت‌های فروش"
      />
      <NotificationCenterPanel />
    </div>
  );
}
