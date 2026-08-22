"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { getUserWorkspacesAction, switchWorkspaceAction } from "@/actions/workspace";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export function WorkspaceSwitcher({ currentWorkspaceId }: { currentWorkspaceId: string }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    getUserWorkspacesAction().then((res) => {
      if (res.ok) setWorkspaces(res.data);
      setLoading(false);
    });
  }, []);

  if (loading || workspaces.length <= 1) return null;

  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  function handleSwitch(wsId: string) {
    if (wsId === currentWorkspaceId) return;
    startTransition(async () => {
      const res = await switchWorkspaceAction(wsId);
      if (res.ok) {
        toast.success("ورک‌اسپیس تغییر کرد");
        router.refresh();
      } else {
        toast.error(res.error ?? "خطا در سوئیچ ورک‌اسپیس");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
          <span className="max-w-[120px] truncate">{current?.name ?? "ورک‌اسپیس"}</span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>سوئیچ ورک‌اسپیس</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            disabled={pending || ws.id === currentWorkspaceId}
            onClick={() => handleSwitch(ws.id)}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 truncate">
              <p className="text-sm">{ws.name}</p>
              <p className="text-xs text-muted-foreground">{ws.role}</p>
            </div>
            {ws.id === currentWorkspaceId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
