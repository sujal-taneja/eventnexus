import { describe, expect, it } from "vitest";
import { createBookingTicketsPdfBytes } from "./booking-ticket-pdf";

describe("booking-ticket-pdf", () => {
  it("returns a valid PDF byte array (light theme)", () => {
    // Tiny 1x1 transparent PNG
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+8o1cAAAAASUVORK5CYII=";
    const qrDataUrl = `data:image/png;base64,${tinyPngBase64}`;

    const bytes = createBookingTicketsPdfBytes({
      userName: "Alice",
      userEmail: "alice@example.com",
      paymentIntentId: "pi_123",
      events: [
        {
          eventTitle: "Concert",
          eventDate: "Sunday, 30 March 2026",
          eventTime: "10:15 AM IST",
          eventLocation: "Mumbai",
          qrPayload: "eventnexus:batch:book-1",
          qrDataUrl,
          rows: [
            {
              bookingId: "book-1",
              ticketName: "VIP",
              quantity: 2,
              totalAmount: 1000,
              status: "CONFIRMED",
            },
          ],
        },
      ],
    });

    expect(bytes.byteLength).toBeGreaterThan(200);
    const asText = Buffer.from(bytes).toString("latin1", 0, 5);
    expect(asText).toBe("%PDF-"); // jsPDF starts with %PDF-...
  });
});

