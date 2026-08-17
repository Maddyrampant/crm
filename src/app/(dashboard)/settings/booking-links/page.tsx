import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { listBookingLinks } from "@/services/bookings";
import { PageHeader } from "@/components/ui/page-header";
import { BookingLinksPanel } from "@/components/bookings/booking-links-panel";

export const metadata: Metadata = { title: "لینک‌های رزرو" };

export default async function BookingLinksPage() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const linksResult = await listBookingLinks(workspaceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="لینک‌های رزرو"
        description="لینکهای عمومی رزرو جلسه برای اشتراک‌گذاری با مشتریان"
      />
      <BookingLinksPanel links={linksResult.items} />
    </div>
  );
}
