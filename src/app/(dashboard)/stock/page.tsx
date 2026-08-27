import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listProducts, listLowStock } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { StockTable } from "@/components/inventory/stock-table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "موجودی انبار" };

export default async function StockPage() {
  const { workspaceId } = await requireWorkspace();

  const [productsResult, lowStock] = await Promise.all([
    listProducts({ workspaceId, page: 1 }),
    listLowStock(workspaceId, 200),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="موجودی انبار"
        description="موجودی کل کالاها، سطح هر انبار و گردش موجودی."
      />
      <StockTable
        initialData={productsResult}
        lowStockIds={lowStock.map((p) => p.id)}
      />
    </div>
  );
}
