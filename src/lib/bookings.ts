export const BOOKING_DURATIONS = [15, 30, 45, 60] as const;

export type BookingDuration = (typeof BOOKING_DURATIONS)[number];

export type BookingLinkInput = {
  title: string;
  userId: string;
  durationMinutes: BookingDuration;
  location?: string;
  description?: string;
  slug?: string;
};

export type BookingSlot = {
  startsAt: string;
  endsAt: string;
  label: string;
};

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base || "meeting"}-${rand}`;
}

export function calculateAvailableSlots(
  existingAppointments: { startsAt: Date; endsAt: Date | null }[],
  durationMinutes: number,
  horizonDays = 14
): BookingSlot[] {
  const now = new Date();
  const slots: BookingSlot[] = [];
  const step = durationMinutes * 60 * 1000;
  const startHour = 9;
  const endHour = 17;

  for (let d = 0; d < horizonDays; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d + 1);
    if (day.getDay() === 5 || day.getDay() === 6) continue;

    const dayStart = new Date(day);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(endHour, 0, 0, 0);

    for (let t = dayStart.getTime(); t + step <= dayEnd.getTime(); t += step) {
      const slotStart = new Date(t);
      const slotEnd = new Date(t + step);

      const overlaps = existingAppointments.some((appt) => {
        const aStart = new Date(appt.startsAt).getTime();
        const aEnd = appt.endsAt
          ? new Date(appt.endsAt).getTime()
          : aStart + 30 * 60 * 1000;
        return slotStart.getTime() < aEnd && slotEnd.getTime() > aStart;
      });

      if (!overlaps) {
        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
          label: `${slotStart.toLocaleDateString("fa-IR", { weekday: "long" })} ${slotStart.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`,
        });
      }
    }
  }
  return slots;
}
