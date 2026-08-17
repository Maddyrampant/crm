"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  updateMemberRoleAction,
} from "@/actions/workspace";
import type { EditableRole, WorkspaceMemberRow } from "@/services/workspace";

type MemberRole = WorkspaceMemberRow["role"];

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "مالک",
  admin: "مدیر",
  manager: "سرپرست",
  seller: "فروشنده",
  viewer: "بیننده",
};

const ROLE_VARIANT: Record<
  MemberRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  owner: "default",
  admin: "secondary",
  manager: "secondary",
  seller: "outline",
  viewer: "outline",
};

const EDITABLE_ROLES: { value: EditableRole; label: string }[] = [
  { value: "admin", label: "مدیر" },
  { value: "manager", label: "سرپرست" },
  { value: "seller", label: "فروشنده" },
  { value: "viewer", label: "بیننده" },
];

type Props = {
  members: WorkspaceMemberRow[];
  currentUserId: string;
};

export function TeamMembersPanel({ members, currentUserId }: Props) {
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<EditableRole>("seller");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function handleAdd() {
    if (!email.trim() || saving) return;
    setSaving(true);
    const result = await addWorkspaceMemberAction({
      email: email.trim(),
      role: newRole,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("عضو با موفقیت اضافه شد");
      setEmail("");
      router.refresh();
    } else {
      toast.error(result.error ?? "خطا در افزودن عضو");
    }
  }

  async function handleRoleChange(member: WorkspaceMemberRow, role: EditableRole) {
    if (member.role === role || busyId) return;
    setBusyId(member.id);
    const result = await updateMemberRoleAction(member.id, role);
    setBusyId(null);
    if (result.ok) {
      toast.success("نقش با موفقیت تغییر کرد");
      router.refresh();
    } else {
      toast.error(result.error ?? "خطا در تغییر نقش");
    }
  }

  async function handleRemove(member: WorkspaceMemberRow) {
    if (busyId) return;
    if (!confirm(`«${member.name}» از اعضای تیم حذف شود؟`)) return;
    setBusyId(member.id);
    const result = await removeWorkspaceMemberAction(member.id);
    setBusyId(null);
    if (result.ok) {
      toast.success("عضو حذف شد");
      router.refresh();
    } else {
      toast.error(result.error ?? "خطا در حذف عضو");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">اعضای تیم</CardTitle>
        <CardDescription>
          نقش‌ها: مالک / مدیر / سرپرست / فروشنده / بیننده — فقط مدیر به بالا می‌تواند
          اعضا را مدیریت کند.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="grid min-w-56 flex-1 gap-1">
            <Label className="text-xs text-muted-foreground">ایمیل عضو</Label>
            <Input
              type="email"
              dir="ltr"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="grid min-w-32 gap-1">
            <Label className="text-xs text-muted-foreground">نقش</Label>
            <Select
              value={newRole}
              onValueChange={(v) => setNewRole(v as EditableRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={saving || !email.trim()}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            افزودن عضو
          </Button>
        </div>

        <ul className="space-y-2">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">عضوی در تیم نیست.</p>
          )}
          {members.map((member) => {
            const isSelf = member.id === currentUserId;
            const isOwner = member.role === "owner";
            const editable = !isSelf && !isOwner;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="grid gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{member.name}</p>
                    {isSelf && <Badge variant="outline">شما</Badge>}
                    {isOwner && (
                      <Badge variant={ROLE_VARIANT.owner}>{ROLE_LABELS.owner}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {member.email}
                  </p>
                </div>

                {editable ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        handleRoleChange(member, v as EditableRole)
                      }
                    >
                      <SelectTrigger className="w-32" disabled={busyId === member.id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EDITABLE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-destructive"
                      disabled={busyId === member.id}
                      onClick={() => handleRemove(member)}
                    >
                      {busyId === member.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Badge variant={ROLE_VARIANT[member.role]}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
