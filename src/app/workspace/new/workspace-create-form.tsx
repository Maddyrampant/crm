"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createWorkspaceAction } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function WorkspaceCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    const result = await createWorkspaceAction(null, formData);
    setLoading(false);

    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">ساخت ورک‌اسپیس</CardTitle>
        <CardDescription>
          اولین قدم؛ نام فضای کاری خود را وارد کنید
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">نام ورک‌اسپیس</Label>
            <Input
              id="name"
              placeholder="مثلاً: آژانس دیجیتال مهر"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            ایجاد ورک‌اسپیس
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
