import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <SearchX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">صفحه یافت نشد</h1>
      <p className="text-muted-foreground">
        صفحه‌ای که دنبال آن هستید وجود ندارد یا منتقل شده است.
      </p>
      <Button asChild>
        <Link href="/">بازگشت به داشبورد</Link>
      </Button>
    </div>
  );
}
