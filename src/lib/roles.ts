import type { WorkspaceMember } from "@/db/schema";

export const ROLE_LEVEL: Record<WorkspaceMember["role"], number> = {
  viewer: 0,
  seller: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export type RoleLevel = keyof typeof ROLE_LEVEL;
