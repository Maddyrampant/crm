import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/layout/user-menu";

export function AppHeader({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <UserMenu name={userName} email={userEmail} />
    </header>
  );
}
