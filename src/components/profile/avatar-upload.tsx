"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  name: string;
  image?: string | null;
  initials: string;
};

export function AvatarUpload({ name, image, initials }: Props) {
  return (
    <Avatar size="lg" className="size-16 text-lg">
      <AvatarImage src={image ?? undefined} alt={name} />
      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
