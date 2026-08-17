import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileManager } from "@/components/profile/profile-manager";

export const metadata: Metadata = { title: "پروفایل" };

export default async function ProfilePage() {
  const { user } = await requireWorkspace();
  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل"
        description="مدیریت اطلاعات حساب کاربری."
      />
      <ProfileManager user={user} />
    </div>
  );
}
