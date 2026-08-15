import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/layout/user-menu";
import { PageTitle } from "@/components/layout/page-title";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";

export function AppHeader({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />
      <PageTitle />
      <div className="flex-1" />
      <div className="hidden md:block">
        <GlobalSearch />
      </div>
      <NotificationBell />
      <UserMenu name={userName} email={userEmail} />
    </header>
  );
}
