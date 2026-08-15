"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
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

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "خطا در ثبت‌نام");
      return;
    }

    toast.success("حساب شما ساخته شد");
    router.push("/workspace/new");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">ثبت‌نام</CardTitle>
        <CardDescription>
          ساخت حساب جدید در سیستم CRM
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">نام و نام خانوادگی</Label>
            <Input
              id="name"
              placeholder="مثلاً: علی محمدی"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              placeholder="حداقل ۸ کاراکتر"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            ثبت‌نام
          </Button>
          <p className="text-sm text-muted-foreground">
            قبلاً حساب ساخته‌اید؟{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              وارد شوید
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
