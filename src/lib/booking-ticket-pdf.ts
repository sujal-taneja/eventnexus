import { jsPDF } from "jspdf";

export type BookingPdfRow = {
  bookingId: string;
  ticketName: string;
  quantity: number;
  totalAmount: number;
  status?: string;
};

export type BookingPdfEvent = {
  eventTitle: string;
  eventDate: string; // human-readable (e.g. "Sunday, 12 January 2026")
  eventTime: string; // human-readable with timezone (e.g. "3:30 PM IST")
  eventLocation: string;
  qrPayload: string;
  qrDataUrl: string; // data:image/png;base64,...
  rows: BookingPdfRow[];
};

export type BookingTicketsPdfParams = {
  userName: string;
  userEmail?: string;
  paymentIntentId: string;
  events: BookingPdfEvent[];
};

function fmtInr(amount: number) {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function safeSplit(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth);
}

/**
 * Creates a light-themed PDF (white background, dark text) with:
 * - user details
 * - event details (title/date/time/location)
 * - booking rows (booking id, ticket name, qty, amount)
 * - QR code per event
 *
 * Returns raw bytes so it can be used in:
 * - browser downloads
 * - email attachments (Resend)
 */
export function createBookingTicketsPdfBytes(
  params: BookingTicketsPdfParams
): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Light mode background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setTextColor(0, 0, 0);

  const marginX = 48;
  let y = 44;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("EventNexus", marginX, y);
  y += 22;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Booking reference: ${params.paymentIntentId}`, marginX, y);
  y += 16;
  doc.text(`Attendee: ${params.userName}`, marginX, y);
  if (params.userEmail) {
    y += 14;
    doc.text(`Email: ${params.userEmail}`, marginX, y);
  }
  y += 18;

  for (let i = 0; i < params.events.length; i++) {
    const ev = params.events[i];

    // Page break if needed
    if (y > pageHeight - 220) {
      doc.addPage();
      y = 44;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(ev.eventTitle.slice(0, 80), marginX, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const details = [
      `When: ${ev.eventDate}`,
      `Time: ${ev.eventTime}`,
      `Where: ${ev.eventLocation}`,
    ];

    // QR block (right side)
    const qrSize = 120;
    const qrX = pageWidth - marginX - qrSize;
    const qrY = y - 2;

    try {
      doc.addImage(ev.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {
      // If addImage fails, keep PDF readable (QR will be missing, not fatal)
    }

    const leftWidth = qrX - marginX - 16;
    for (const line of details) {
      const parts = safeSplit(doc, line, leftWidth);
      doc.text(parts, marginX, y);
      y += 14 * parts.length;
    }

    y += 10;

    // Booking rows
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Bookings", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    for (const row of ev.rows) {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 44;
      }

      const rowLines = [
        `Booking ID: ${row.bookingId}`,
        `Ticket: ${row.ticketName} (x${row.quantity})`,
        `Amount: ${fmtInr(row.totalAmount)}`,
        row.status ? `Status: ${row.status}` : undefined,
      ].filter(Boolean) as string[];

      for (const rl of rowLines) {
        const parts = safeSplit(doc, rl, pageWidth - marginX * 2);
        doc.text(parts, marginX, y);
        y += 12 * parts.length;
      }
      y += 6;
    }

    // Footer / instruction
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    const instruction = "Present this QR at check-in.";
    const parts = safeSplit(doc, instruction, pageWidth - marginX * 2);
    doc.text(parts, marginX, Math.min(y + 6, pageHeight - 30));
    doc.setTextColor(0, 0, 0);

    y += 18;
  }

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

