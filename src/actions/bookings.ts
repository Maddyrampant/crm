"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  createBookingLink,
  deleteBookingLink,
  getAvailableSlots,
  listBookingLinks,
  toggleBookingLink,
} from "@/services/bookings";
import type { BookingLinkInput } from "@/lib/bookings";

export async function getBookingLinksAction(params?: { page?: number; pageSize?: number; search?: string; active?: boolean }) {
  const { workspaceId } = await requireWorkspace();
  return listBookingLinks(workspaceId, params);
}

export async function createBookingLinkAction(raw: unknown) {
  const { workspaceId, user: currentUser } = await requireWorkspaceRole("seller");
  try {
    const row = await createBookingLink(workspaceId, { ...(raw as BookingLinkInput), userId: currentUser.id });
    revalidatePath("/settings");
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ایجاد لینک" };
  }
}

export async function toggleBookingLinkAction(linkId: string, active: boolean) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await toggleBookingLink(workspaceId, linkId, active);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function deleteBookingLinkAction(linkId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteBookingLink(workspaceId, linkId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function getAvailableSlotsAction(slug: string) {
  const { getPublicBookingLink, getAvailableSlots } = await import("@/services/bookings");
  const l = await getPublicBookingLink(slug);
  if (!l) return [];
  return getAvailableSlots(l.userId, l.durationMinutes);
}

export async function bookSlotAction(
  slug: string,
  input: {
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    startsAt: string;
    notes?: string;
  }
) {
  const { getPublicBookingLink, bookSlot } = await import("@/services/bookings");
  const link = await getPublicBookingLink(slug);
  if (!link) return { ok: false, error: "لینک نامعتبر" };
  try {
    const result = await bookSlot(link.workspaceId, slug, input);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در رزرو" };
  }
}
