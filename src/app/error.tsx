"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">خطایی رخ داد</h2>
          <p className="text-muted-foreground">
            {error.message || "مشکلی پیش آمده است."}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              کد خطا: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>تلاش مجدد</Button>
            <Button variant="outline" asChild>
              <Link href="/">بازگشت به خانه</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
