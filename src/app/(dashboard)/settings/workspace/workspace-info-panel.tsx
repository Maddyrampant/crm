"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Shield } from "lucide-react";
import {
  updateWorkspaceNameAction,
  deleteWorkspaceAction,
} from "@/actions/workspace";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "مالک",
  admin: "مدیر",
  manager: "سرپرست",
  seller: "فروشنده",
  viewer: "بیننده",
};

type Props = {
  workspace: Workspace;
  currentUserId: string;
  userRole: string;
};

export function WorkspaceInfoPanel({ workspace, currentUserId, userRole }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleNameChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    if (!name.trim()) {
      toast.error("نام را وارد کنید");
      return;
    }
    startTransition(async () => {
      const res = await updateWorkspaceNameAction({ name: name.trim() });
      if (res.ok) {
        toast.success("نام ورک‌اسپیس بروزرسانی شد");
        router.refresh();
      } else {
        toast.error("error" in res ? res.error : "خطا در بروزرسانی");
      }
    });
  }

  function handleDelete() {
    if (!confirm("آیا از حذف کل ورک‌اسپیس اطمینان دارید؟ تمام داده‌ها حذف خواهند شد!")) return;
    startTransition(async () => {
      const res = await deleteWorkspaceAction();
      if (!res.ok) {
        toast.error("error" in res ? res.error : "خطا در حذف");
      }
    });
  }

  const isOwner = userRole === "owner";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            اطلاعات ورک‌اسپیس
            {isOwner && <Badge variant="default">مالک</Badge>}
          </CardTitle>
          <CardDescription>
            نام و اطلاعات فضای کاری خود را مدیریت کنید
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">شناسه</Label>
              <p className="font-mono text-sm">{workspace.id.slice(0, 8)}...</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">اسلاگ</Label>
              <p className="font-mono text-sm" dir="ltr">{workspace.slug}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">تاریخ ایجاد</Label>
              <p className="text-sm">{new Date(workspace.createdAt).toLocaleDateString("fa-IR")}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">مالک</Label>
              <p className="text-sm">{workspace.ownerId === currentUserId ? "شما" : workspace.ownerId.slice(0, 8) + "..."}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4" />
              ویرایش نام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNameChange} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="ws-name">نام ورک‌اسپیس</Label>
                <Input
                  id="ws-name"
                  name="name"
                  defaultValue={workspace.name}
                  placeholder="نام فضای کاری"
                />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "در حال ذخیره..." : "ذخیره"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" />
              منطقه خطر
            </CardTitle>
            <CardDescription>
              حذف ورک‌اسپیس تمام داده‌ها، اعضا، فروش‌ها و فاکتورها را برای همیشه پاک می‌کند.
              این عمل غیرقابل بازگشت است.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled={pending} onClick={handleDelete}>
              حذف ورک‌اسپیس
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
