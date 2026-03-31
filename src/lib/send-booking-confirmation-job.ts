import "server-only";
import QRCode from "qrcode";
import { sendBookingConfirmation } from "@/lib/mailer";
import { claimBookingConfirmationSend } from "@/lib/booking-email-once";
import { uniqueBookingConfirmationEmails } from "@/lib/email-recipients";
import type { EmailFallbackTheme, EmailTheme } from "@/types/email-theme";
import { formatEventDateTime } from "@/lib/timezone";
import { getAppUrl } from "@/lib/app-url";

type BookingRow = {
  id: string;
  eventId: string;
  quantity: number;
  totalAmount: number;
  ticketType: { name: string };
  status?: string;
  event: { title: string; date: Date; location: string; timeZone?: string | null };
};

/**
 * Group QR codes by event: one scannable code per event per checkout batch
 * (payload lists all booking row ids in that batch for the event).
 */
export async function sendBookingConfirmationJob(params: {
  userEmail: string;
  /** Checkout contact email — deduped with account email before send. */
  receiptEmail?: string | null;
  userName: string;
  paymentIntentId: string;
  bookings: BookingRow[];
  emailTheme?: EmailTheme;
  emailFallbackTheme?: EmailFallbackTheme;
}): Promise<void> {
  const {
    userEmail,
    receiptEmail,
    userName,
    paymentIntentId,
    bookings,
    emailTheme,
    emailFallbackTheme,
  } = params;
  if (bookings.length === 0) return;

  const recipients = uniqueBookingConfirmationEmails(userEmail, receiptEmail);
  if (recipients.length === 0) return;

  const ok = await claimBookingConfirmationSend(paymentIntentId);
  if (!ok) return;

  const byEvent = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    if (!byEvent.has(b.eventId)) byEvent.set(b.eventId, []);
    byEvent.get(b.eventId)!.push(b);
  }

  const qrBatches: {
    eventId: string;
    eventTitle: string;
    qrPayload: string;
    dataUrl: string;
  }[] = [];

  for (const [eventId, group] of byEvent) {
    const ids = group.map((g) => g.id).sort();
    const title = group[0].event.title;
    const qrPayload = `eventnexus:batch:${ids.join(",")}`;
    const dataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 200,
    });
    qrBatches.push({ eventId, eventTitle: title, qrPayload, dataUrl });
  }

  const bookingLines = bookings.map((b) => {
    const start = new Date(b.event.date);
    const fmt = formatEventDateTime({
      date: start,
      timeZone: b.event.timeZone ?? undefined,
      locale: "en-IN",
    });
    return {
      bookingId: b.id,
      eventId: b.eventId,
      eventTitle: b.event.title,
      eventDate: fmt.dateLong,
      eventTime: fmt.timeShort,
      eventStartsIso: fmt.startsIso,
      eventLocation: b.event.location,
      ticketName: b.ticketType.name,
      quantity: b.quantity,
      totalAmount: b.totalAmount,
      status: b.status,
    };
  });

  const base = getAppUrl();
  const props = {
    userName,
    bookings: bookingLines,
    paymentIntentId,
    dashboardUrl: `${base}/dashboard`,
    qrBatches,
    emailTheme,
    emailFallbackTheme,
  };
  for (const to of recipients) {
    await sendBookingConfirmation(to, props);
  }
}
