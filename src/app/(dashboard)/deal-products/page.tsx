import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "کالاهای فرصت" };

export default async function DealProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="کالاهای فرصت فروش"
        description="مشاهده و مدیریت کالاهای اضافه‌شده به فرصت‌های فروش."
      />
      <p className="text-sm text-muted-foreground">
        این بخش از صفحه جزئیات هر فرصت فروش قابل دسترسی است. به صفحه فروش مورد نظر بروید و کالاها را اضافه کنید.
      </p>
    </div>
  );
}
