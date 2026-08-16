import { requireWorkspace, hasPermission } from "@/lib/session";
import { listProducts, listProductCategories } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { ProductsTable } from "@/components/inventory/products-table";

export default async function ProductsPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const [productsResult, categories] = await Promise.all([
    listProducts({ workspaceId, page: 1 }),
    listProductCategories(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="کالاها"
        description="کاتالوگ کالاها، قیمت‌ها و موجودی کل."
      />
      <ProductsTable
        initialData={productsResult}
        categories={categories}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
