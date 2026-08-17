"use server";

import { requireWorkspace } from "@/lib/session";
import {
  getForecast,
  getWinPrediction,
  getBestTimeToContact,
  getStalledDeals,
} from "@/services/forecast";

export async function getForecastAction() {
  const { workspaceId } = await requireWorkspace();
  return getForecast(workspaceId);
}

export async function getWinPredictionAction(dealId: string) {
  const { workspaceId } = await requireWorkspace();
  return getWinPrediction(workspaceId, dealId);
}

export async function getBestTimeToContactAction(contactId: string) {
  const { workspaceId } = await requireWorkspace();
  return getBestTimeToContact(workspaceId, contactId);
}

export async function getStalledDealsAction(daysThreshold = 14) {
  const { workspaceId } = await requireWorkspace();
  return getStalledDeals(workspaceId, daysThreshold);
}
