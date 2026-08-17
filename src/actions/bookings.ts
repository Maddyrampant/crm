"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  createBookingLink,
  deleteBookingLink,
  getAvailableSlots,
  listBookingLinks,
  toggleBookingLink,
} from "@/services/bookings";

const createBookingLinkSchema = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  slug: z.string().max(100).optional(),
});

export async function getBookingLinksAction(params?: { page?: number; pageSize?: number; search?: string; active?: boolean }) {
  const { workspaceId } = await requireWorkspace();
  return listBookingLinks(workspaceId, params);
}

export async function createBookingLinkAction(raw: unknown) {
  const { workspaceId, user: currentUser } = await requireWorkspaceRole("seller");
  const parsed = createBookingLinkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  try {
    const row = await createBookingLink(workspaceId, { ...parsed.data, durationMinutes: parsed.data.durationMinutes as 15 | 30 | 45 | 60, userId: currentUser.id });
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
