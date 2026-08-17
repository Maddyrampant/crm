import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appointments, bookingLinks, user } from "@/db/schema";
import {
  generateSlug,
  calculateAvailableSlots,
  type BookingLinkInput,
  type BookingSlot,
} from "@/lib/bookings";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";

/* ─────────────── CRUD ─────────────── */

export type BookingLinkRow = {
  id: string;
  title: string;
  slug: string;
  userId: string;
  userName: string | null;
  durationMinutes: number;
  location: string | null;
  active: boolean;
  createdAt: Date;
};

const baseBookingLinkSelect = {
  id: bookingLinks.id,
  title: bookingLinks.title,
  slug: bookingLinks.slug,
  userId: bookingLinks.userId,
  userName: user.name,
  durationMinutes: bookingLinks.durationMinutes,
  location: bookingLinks.location,
  active: bookingLinks.active,
  createdAt: bookingLinks.createdAt,
};

export async function listBookingLinks(
  workspaceId: string,
  params?: { page?: number; pageSize?: number; search?: string; active?: boolean }
): Promise<PaginatedResult<BookingLinkRow>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const offset = calculateOffset(page, pageSize);

  const conditions: SQL[] = [eq(bookingLinks.workspaceId, workspaceId)];
  if (params?.search) {
    conditions.push(ilike(bookingLinks.title, `%${params.search.trim()}%`));
  }
  if (params?.active !== undefined) {
    conditions.push(eq(bookingLinks.active, params.active));
  }
  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select(baseBookingLinkSelect)
      .from(bookingLinks)
      .leftJoin(user, eq(user.id, bookingLinks.userId))
      .where(where)
      .orderBy(desc(bookingLinks.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(bookingLinks)
      .where(where),
  ]);

  return buildPaginatedResult(items, totalRow[0]?.count ?? 0, page, pageSize);
}

export async function createBookingLink(workspaceId: string, input: BookingLinkInput) {
  const slug = input.slug?.trim() || generateSlug(input.title);

  const existing = await db
    .select({ id: bookingLinks.id })
    .from(bookingLinks)
    .where(eq(bookingLinks.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("این لینک قبلاً استفاده شده است");
  }

  const [row] = await db
    .insert(bookingLinks)
    .values({
      workspaceId,
      userId: input.userId,
      title: input.title,
      slug,
      durationMinutes: input.durationMinutes,
      location: input.location ?? null,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function toggleBookingLink(workspaceId: string, id: string, active: boolean) {
  const [row] = await db
    .update(bookingLinks)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(bookingLinks.id, id), eq(bookingLinks.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteBookingLink(workspaceId: string, id: string) {
  const [row] = await db
    .delete(bookingLinks)
    .where(and(eq(bookingLinks.id, id), eq(bookingLinks.workspaceId, workspaceId)))
    .returning({ id: bookingLinks.id });
  return row ?? null;
}

/* ─────────────── Public ─────────────── */

export async function getPublicBookingLink(slug: string) {
  const [link] = await db
    .select({
      id: bookingLinks.id,
      title: bookingLinks.title,
      slug: bookingLinks.slug,
      userId: bookingLinks.userId,
      durationMinutes: bookingLinks.durationMinutes,
      location: bookingLinks.location,
      description: bookingLinks.description,
      userName: user.name,
      workspaceId: bookingLinks.workspaceId,
    })
    .from(bookingLinks)
    .leftJoin(user, eq(user.id, bookingLinks.userId))
    .where(and(eq(bookingLinks.slug, slug), eq(bookingLinks.active, true)))
    .limit(1);
  return link ?? null;
}

export async function getAvailableSlots(
  userId: string,
  durationMinutes: number,
  horizonDays = 14
): Promise<BookingSlot[]> {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + horizonDays);

  const existing = await db
    .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        gte(appointments.startsAt, now),
        lt(appointments.startsAt, horizon)
      )
    )
    .orderBy(asc(appointments.startsAt));

  return calculateAvailableSlots(
    existing.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt })),
    durationMinutes,
    horizonDays
  );
}

export async function bookSlot(
  workspaceId: string,
  slug: string,
  input: {
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    startsAt: string;
    notes?: string;
  }
) {
  const link = await getPublicBookingLink(slug);
  if (!link) throw new Error("لینک رزرو نامعتبر یا غیرفعال است");

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + link.durationMinutes * 60 * 1000);

  const [appt] = await db
    .insert(appointments)
    .values({
      workspaceId,
      userId: link.userId,
      title: `${link.title} — ${input.guestName}`,
      type: "meeting",
      startsAt,
      endsAt,
      notes: [
        input.notes,
        `📧 ${input.guestEmail}`,
        input.guestPhone ? `📱 ${input.guestPhone}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .returning();

  return {
    appointmentId: appt.id,
    title: link.title,
    startsAt: appt.startsAt.toISOString(),
    endsAt: appt.endsAt?.toISOString(),
    hostName: link.userName,
  };
}
