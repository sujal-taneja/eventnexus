import QRCodeNode from "qrcode";
import { jsPDF } from "jspdf";

export type TicketPdfRow = {
  bookingId: string;
  ticketName: string;
  quantity: number;
  totalAmount?: number;
  status?: string;
};

export type GenerateTicketsPdfInput = {
  userName: string;
  userEmail?: string;
  paymentIntentId?: string | null;
  eventTitle: string;
  eventDateLong?: string;
  eventTime?: string;
  eventLocation?: string;
  qrPayload: string;
  /** Optional QR image to avoid re-generating */
  qrDataUrl?: string;
  bookingRows?: TicketPdfRow[];
};

function sanitizeFilename(s: string) {
  return s.replace(/[^\w\d]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function toLines(rows: TicketPdfRow[]) {
  return rows.map((r) => {
    const qty = `${r.quantity}`;
    return `${r.ticketName} × ${qty}`;
  });
}

export async function generateTicketsPdf(
  input: GenerateTicketsPdfInput
): Promise<{ bytes: Uint8Array; filename: string }> {
  const safeEvent = sanitizeFilename(input.eventTitle) || "event";
  const filename = `eventnexus-${safeEvent}-tickets.pdf`;

  const qrDataUrl =
    input.qrDataUrl ??
    (await QRCodeNode.toDataURL(input.qrPayload, {
      margin: 1,
      width: 320,
    }));

  // Light mode PDF: white background, dark text.
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 44;

  // Header
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), "F");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("EventNexus", marginX, y);

  y += 22;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(input.eventTitle.slice(0, 80), marginX, y);

  y += 18;

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  const metaParts: string[] = [];
  if (input.eventDateLong) metaParts.push(input.eventDateLong);
  if (input.eventTime) metaParts.push(input.eventTime);
  if (metaParts.length) {
    doc.text(metaParts.join(" · ").slice(0, 120), marginX, y);
    y += 14;
  }
  if (input.eventLocation) {
    doc.text(`Location: ${input.eventLocation}`.slice(0, 110), marginX, y);
    y += 14;
  }

  if (input.userName || input.userEmail) {
    const userLine = [
      input.userName ? `For: ${input.userName}` : undefined,
      input.userEmail ? `<${input.userEmail}>` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    doc.text(userLine.slice(0, 120), marginX, y);
    y += 14;
  }

  if (input.paymentIntentId) {
    doc.setFont("helvetica", "bold");
    doc.text(`Reference: ${input.paymentIntentId}`.slice(0, 120), marginX, y);
    doc.setFont("helvetica", "normal");
    y += 14;
  }

  // Booking rows
  const rows = input.bookingRows ?? [];
  if (rows.length) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Tickets", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");

    const lines = toLines(rows);
    const display = lines.slice(0, 8); // keep it compact; QR still validates.
    doc.setFontSize(10);

    for (let i = 0; i < display.length; i++) {
      const line = display[i];
      doc.text(line.slice(0, 120), marginX, y);
      y += 12;
    }

    const bookingIds = rows.map((r) => r.bookingId).slice(0, 10);
    if (bookingIds.length) {
      y += 6;
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(`Booking IDs: ${bookingIds.join(", ")}`.slice(0, 160), marginX, y, {
        maxWidth: pageW - marginX * 2,
      });
      y += 12;
      doc.setTextColor(0, 0, 0);
    }
  }

  // QR block
  const qrSize = 220;
  const qrX = pageW - marginX - qrSize;
  const qrY = 110;
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  doc.setFontSize(9.5);
  doc.setTextColor(70, 70, 70);
  doc.text(
    "Present this QR at check-in.",
    qrX,
    qrY + qrSize + 14
  );
  doc.setTextColor(0, 0, 0);

  // Footer: QR payload (compact)
  doc.setFontSize(7.5);
  const payload = input.qrPayload.slice(0, 90);
  doc.setTextColor(110, 110, 110);
  doc.text(payload, marginX, doc.internal.pageSize.getHeight() - 30);

  const ab = doc.output("arraybuffer");
  return {
    bytes: new Uint8Array(ab),
    filename,
  };
}

