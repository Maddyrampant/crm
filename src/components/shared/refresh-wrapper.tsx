"use client";

import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";

type Props = {
  children: (refresh: () => void) => ReactNode;
};

export function RefreshWrapper({ children }: Props) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  return <>{children(refresh)}</>;
}
