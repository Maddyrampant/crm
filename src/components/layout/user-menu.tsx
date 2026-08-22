"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, Settings } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("خارج شدید");
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <DropdownMenuLabel className="grid gap-1">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-muted-foreground" dir="ltr">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User />
            پروفایل
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/workspace">
            <Settings />
            تنظیمات ورک‌اسپیس
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut />
          خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
