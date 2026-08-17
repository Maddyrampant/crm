import { notFound } from "next/navigation";
import { getPublicBookingLink, getAvailableSlots } from "@/services/bookings";
import { BookingForm } from "@/components/bookings/booking-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const link = await getPublicBookingLink(slug);
  if (!link) notFound();

  const slots = await getAvailableSlots(link.userId, link.durationMinutes);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">{link.title}</h1>
      <p className="mb-1 text-muted-foreground">
        میزبان: <span className="font-medium text-foreground">{link.userName}</span>
      </p>
      {link.location && (
        <p className="mb-1 text-sm text-muted-foreground">مکان: {link.location}</p>
      )}
      {link.description && (
        <p className="mb-6 text-sm text-muted-foreground">{link.description}</p>
      )}
      <BookingForm slug={slug} slots={slots} durationMinutes={link.durationMinutes} />
    </div>
  );
}
