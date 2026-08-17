"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import {
  getDashboardData,
  getSalesChart,
  getTeamPerformance,
} from "@/services/reports";

export async function getDashboardDataAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await getDashboardData(workspaceId);
  return { ok: true, data };
}

export async function getSalesChartAction(months?: number) {
  const { workspaceId } = await requireWorkspace();
  const data = await getSalesChart(workspaceId, months);
  return { ok: true, data };
}

export async function getTeamPerformanceAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await getTeamPerformance(workspaceId);
  return { ok: true, data };
}
