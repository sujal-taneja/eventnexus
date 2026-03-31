import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";

type GlobalTestMocks = {
  __resendSendMock?: ReturnType<typeof vi.fn>;
  __eventReminderEmailMock?: ReturnType<typeof vi.fn>;
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/client-ip", () => ({
  getClientIpFromRequest: vi.fn(() => "127.0.0.1"),
}));

vi.mock("resend", () => {
  // Expose mocks via globalThis because Vitest hoists `vi.mock` factories.
  const mockSend = vi.fn();
  (globalThis as unknown as GlobalTestMocks).__resendSendMock = mockSend;

  return {
    Resend: class ResendMock {
      emails = { send: mockSend };
      constructor(apiKey: string) {
        // no-op
        void apiKey;
      }
    },
  };
});

vi.mock("@react-email/components", () => ({
  render: vi.fn(async () => "<html/>"),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(async () => "data:image/png;base64,Zm9v"),
  },
  toDataURL: vi.fn(async () => "data:image/png;base64,Zm9v"),
}));

const pdfBytesMock = new Uint8Array([37, 80, 68, 70]); // "%PDF"
vi.mock("@/lib/booking-ticket-pdf", () => ({
  createBookingTicketsPdfBytes: vi.fn(() => pdfBytesMock),
}));

vi.mock("@/emails/event-reminder", () => {
  // Vitest hoists `vi.mock` calls; keep the mock entirely inside the factory
  // and expose it via `globalThis` so assertions can read it safely.
  const mock = vi.fn((props) => props);
  (globalThis as unknown as GlobalTestMocks).__eventReminderEmailMock = mock;
  return {
    EventReminderEmail: mock,
  };
});

describe("cron reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test_api_key";
    process.env.NODE_ENV = "test";
    process.env.CRON_SECRET = "secret";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.EMAIL_FROM = "from@example.com";
    const sendMock =
      (globalThis as unknown as GlobalTestMocks).__resendSendMock!;
    sendMock.mockResolvedValue({ error: null });
  });

  it("attaches QR + PDF and passes bookingId into template", async () => {
    const { prisma } = await import("@/lib/prisma");

    const eventDate = new Date("2026-03-31T10:15:00.000Z");

    (prisma.event.findMany as unknown as vi.Mock).mockResolvedValue([
      {
        title: "Concert",
        location: "Mumbai",
        date: eventDate,
        isActive: true,
        bookings: [
          {
            id: "book-123",
            status: "CONFIRMED",
            quantity: 2,
            totalAmount: 500,
            paymentIntentId: "pi_123",
            ticketType: { name: "VIP" },
            user: { email: "alice@example.com", name: "Alice" },
          },
        ],
      },
    ]);

    const req = {
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as { headers: { get: (name: string) => string | null } };

    const res = await GET(req);
    expect(res.status).toBe(200);

    const sendMock =
      (globalThis as unknown as GlobalTestMocks).__resendSendMock!;
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sendArgs = sendMock.mock.calls[0][0];

    const eventReminderEmailMock =
      (globalThis as unknown as GlobalTestMocks).__eventReminderEmailMock!;
    expect(eventReminderEmailMock).toHaveBeenCalledTimes(1);
    const passedProps = eventReminderEmailMock.mock.calls[0][0];
    expect(passedProps.bookingId).toBe("book-123");
    expect(passedProps.qrCid).toBe("enxremqr");

    expect(sendArgs.attachments).toHaveLength(2);
    const [qrAttachment, pdfAttachment] = sendArgs.attachments;
    expect(qrAttachment.contentId).toBe("enxremqr");
    expect(qrAttachment.contentType).toBe("image/png");
    expect(pdfAttachment.contentType).toBe("application/pdf");
  });
});

