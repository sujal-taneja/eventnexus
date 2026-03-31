/**
 * Thin wrapper around Resend.
 *
 * Set these env vars in .env:
 *   RESEND_API_KEY=re_xxxx          — from https://resend.com/api-keys
 *   EMAIL_FROM=noreply@yourdomain.me — must be a verified domain in Resend
 *
 * If RESEND_API_KEY is absent (e.g. in dev without credentials) the function
 * logs the email payload and returns gracefully so the rest of the flow is
 * unaffected.
 */
import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { BookingConfirmationEmail, type BookingConfirmationProps } from "@/emails/booking-confirmation";
import { createBookingTicketsPdfBytes } from "@/lib/booking-ticket-pdf";
import type { EmailFallbackTheme, EmailTheme } from "@/types/email-theme";
import { getAppUrl } from "@/lib/app-url";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "noreply@eventnexus.app";
const APP_URL = getAppUrl();

/** Job passes PNG data URLs; email clients block those — convert to inline CID attachments for Resend. */
export type SendBookingConfirmationInput = Omit<BookingConfirmationProps, "qrBatches"> & {
  qrBatches?: { eventId: string; eventTitle: string; qrPayload: string; dataUrl: string }[];
  emailTheme?: EmailTheme;
  emailFallbackTheme?: EmailFallbackTheme;
};

function inlineQrAttachments(
  batches:
    | { eventTitle: string; dataUrl: string }[]
    | undefined
): {
  attachments: { filename: string; content: Buffer; contentType: string; contentId: string }[];
  qrBatches: { eventTitle: string; cid: string }[];
} {
  if (!batches?.length) return { attachments: [], qrBatches: [] };
  const attachments: {
    filename: string;
    content: Buffer;
    contentType: string;
    contentId: string;
  }[] = [];
  const qrBatches: { eventTitle: string; cid: string }[] = [];
  for (let i = 0; i < batches.length; i++) {
    const q = batches[i];
    const m = /^data:image\/png;base64,([\s\S]+)$/i.exec(q.dataUrl.trim());
    if (!m) continue;
    const cid = `enxqr${i}`;
    attachments.push({
      filename: `qr-${i}.png`,
      content: Buffer.from(m[1].replace(/\s/g, ""), "base64"),
      contentType: "image/png",
      contentId: cid,
    });
    qrBatches.push({ eventTitle: q.eventTitle, cid });
  }
  return { attachments, qrBatches };
}

export async function sendBookingConfirmation(
  to: string,
  props: SendBookingConfirmationInput
) {
  if (!resend) {
    console.log("[MAILER] RESEND_API_KEY not configured — skipping email");
    console.log("[MAILER] Would have sent to:", to, JSON.stringify(props, null, 2));
    return;
  }

  try {
    const { qrBatches: rawQr, ...rest } = props;
    const { attachments, qrBatches } = inlineQrAttachments(rawQr);

    // Light-theme PDF attachment: user + event details + booking ids + QR.
    // This is generated even when QR images are present; the PDF is always white/light.
    let pdfAttachment:
      | { filename: string; content: Buffer; contentType: string }
      | undefined;

    if (rawQr?.length) {
      const bookingsByEventId = new Map<string, typeof rest.bookings>();
      for (const b of rest.bookings) {
        const eventId = b.eventId ?? "";
        if (!eventId) continue;
        if (!bookingsByEventId.has(eventId)) bookingsByEventId.set(eventId, []);
        bookingsByEventId.get(eventId)!.push(b);
      }

      const events = rawQr.map((q) => {
        const group = bookingsByEventId.get(q.eventId) ?? [];
        const first = group[0];
        return {
          eventTitle: q.eventTitle,
          eventDate: first?.eventDate ?? "—",
          eventTime: first?.eventTime ?? "—",
          eventLocation: first?.eventLocation ?? "—",
          qrPayload: q.qrPayload,
          qrDataUrl: q.dataUrl,
          rows: group.map((b) => ({
            bookingId: b.bookingId,
            ticketName: b.ticketName,
            quantity: b.quantity,
            totalAmount: b.totalAmount,
            status: b.status,
          })),
        };
      });

      const pdfBytes = createBookingTicketsPdfBytes({
        userName: rest.userName,
        userEmail: to,
        paymentIntentId: rest.paymentIntentId,
        events,
      });

      pdfAttachment = {
        filename: `eventnexus-booking-${rest.paymentIntentId}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      };
    }

    const html = await render(
      BookingConfirmationEmail({
        ...rest,
        qrBatches,
        dashboardUrl: props.dashboardUrl ?? `${APP_URL}/dashboard`,
      })
    );

    const allAttachments = pdfAttachment
      ? [...attachments, pdfAttachment]
      : attachments;

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Your EventNexus booking is confirmed",
      html,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    });

    if (error) {
      console.error("[MAILER] Resend error:", error);
    }
  } catch (err) {
    // Never let email failure break the booking confirmation flow
    console.error("[MAILER] Unexpected error:", err);
  }
}
