"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Check, Copy } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { toFaDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/profile/avatar-upload";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function ProfileManager({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, startProfileTransition] = useTransition();
  const [savingPassword, startPasswordTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  function handleCopyId() {
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleProfileSave() {
    startProfileTransition(async () => {
      try {
        const res = await fetch("/api/auth/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, image: user.image }),
        });
        if (!res.ok) throw new Error();
        toast.success("پروفایل با موفقیت به‌روزرسانی شد");
      } catch {
        toast.error("خطا در به‌روزرسانی پروفایل");
      }
    });
  }

  function handlePasswordSave() {
    if (newPassword.length < 8) {
      toast.error("رمز عبور جدید باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("رمز عبور جدید با تأیید آن مطابقت ندارد");
      return;
    }

    startPasswordTransition(async () => {
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message ?? "");
        }
        toast.success("رمز عبور با موفقیت تغییر کرد");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch {
        toast.error("خطا در تغییر رمز عبور");
      }
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>اطلاعات شخصی</CardTitle>
          <CardDescription>
            نام و ایمیل حساب کاربری خود را مدیریت کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <AvatarUpload name={name} image={user.image} initials={initials} />
            <div className="space-y-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-name">نام</Label>
            <Input
              id="profile-name"
              dir="rtl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام خود را وارد کنید"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-email">ایمیل</Label>
            <Input
              id="profile-email"
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
            {email !== user.email && (
              <p className="text-xs text-muted-foreground">
                تغییر ایمیل نیاز به تأیید مجدد دارد.
              </p>
            )}
          </div>

          <Button
            onClick={handleProfileSave}
            disabled={savingProfile || !name.trim() || !email.trim()}
          >
            {savingProfile && <Loader2 className="size-4 animate-spin" />}
            ذخیره تغییرات
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تغییر رمز عبور</CardTitle>
          <CardDescription>
            رمز عبور حساب خود را تغییر دهید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">رمز عبور فعلی</Label>
            <Input
              id="current-password"
              type="password"
              dir="ltr"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-password">رمز عبور جدید</Label>
            <Input
              id="new-password"
              type="password"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="حداقل ۸ کاراکتر"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">تأیید رمز عبور جدید</Label>
            <Input
              id="confirm-password"
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="رمز عبور جدید را دوباره وارد کنید"
            />
          </div>

          <Button
            onClick={handlePasswordSave}
            disabled={
              savingPassword ||
              !currentPassword.trim() ||
              !newPassword.trim() ||
              !confirmPassword.trim()
            }
          >
            {savingPassword && <Loader2 className="size-4 animate-spin" />}
            تغییر رمز عبور
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>اطلاعات حساب</CardTitle>
          <CardDescription>
            اطلاعات خواندنی حساب کاربری شما.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">وضعیت ایمیل</span>
            <span
              className={`text-sm font-medium ${
                user.emailVerified
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              }`}
            >
              {user.emailVerified ? "تأیید شده" : "تأیید نشده"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">تاریخ ایجاد</span>
            <span className="text-sm">
              {formatDateTime(user.createdAt)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">آخرین به‌روزرسانی</span>
            <span className="text-sm">
              {formatDateTime(user.updatedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">شناسه کاربری</span>
            <div className="flex items-center gap-1.5">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {toFaDigits(user.id.slice(0, 8))}...
              </code>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopyId}
                title="کپی شناسه کامل"
              >
                {copied ? (
                  <Check className="size-3 text-green-600" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
