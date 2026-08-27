"use client";

import type { ReactNode } from "react";
import { useWindowStore } from "@/store/window-store";

type Props = {
  id: string;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  children: (open: () => void) => ReactNode;
};

export function WindowTrigger({
  id,
  title,
  icon,
  content,
  width,
  height,
  minWidth,
  minHeight,
  children,
}: Props) {
  const openWindow = useWindowStore((s) => s.openWindow);

  return children(() =>
    openWindow({
      id,
      title,
      icon,
      content,
      width,
      height,
      minWidth,
      minHeight,
    })
  );
}
