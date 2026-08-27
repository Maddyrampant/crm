import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listTerritoriesAction } from "@/actions/territories";
import { PageHeader } from "@/components/ui/page-header";
import { TerritoryManager } from "@/components/territories/territory-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مدیریت سرزمین" };

export default async function TerritoriesPage() {
  const { membership } = await requireWorkspace();
  const territories = await listTerritoriesAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت سرزمین"
        description="تخصیص مخاطبین و فروش‌ها بر اساس منطقه جغرافیایی."
      />
      <TerritoryManager
        initialTerritories={territories}
        canManage={hasPermission(membership, "admin")}
      />
    </div>
  );
}
