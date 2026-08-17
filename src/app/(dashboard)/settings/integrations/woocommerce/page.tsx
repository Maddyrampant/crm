import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspaceRole } from "@/lib/session";
import { listWooStores } from "@/actions/woocommerce";
import { PageHeader } from "@/components/ui/page-header";
import { WooStorePanel } from "./woo-store-panel";

export const metadata: Metadata = { title: "اتصال فروشگاه ووکامرس" };

export default async function WooSettingsPage() {
  await requireWorkspaceRole("admin");
  const storesResult = await listWooStores();

  return (
    <div className="space-y-6">
      <PageHeader
        title="اتصال فروشگاه ووکامرس"
        description="فروشگاه‌های ووکامرس متصل را مدیریت کنید"
      />
      <WooStorePanel stores={storesResult.ok ? storesResult.data : []} />
    </div>
  );
}
