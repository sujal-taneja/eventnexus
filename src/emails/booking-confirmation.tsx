import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Column,
  Section,
  Text,
  Link,
  Tailwind,
} from "@react-email/components";

import type { EmailFallbackTheme, EmailTheme } from "@/types/email-theme";

export interface BookingConfirmationProps {
  userName: string;
  bookings: {
    bookingId: string;
    eventId?: string;
    eventTitle: string;
    eventDate: string;
    /** Local start time with timezone (for humans + calendar helpers). */
    eventTime: string;
    /** ISO-8601 UTC — paste into calendar / AI assistants. */
    eventStartsIso: string;
    eventLocation: string;
    ticketName: string;
    quantity: number;
    totalAmount: number;
    status?: string;
  }[];
  paymentIntentId: string;
  dashboardUrl: string;
  /** One QR per event — inline CID refs (mailer attaches PNGs). */
  qrBatches?: { eventTitle: string; cid: string }[];
  /** Email theme strategy: explicit light/dark or auto via prefers-color-scheme. */
  emailTheme?: EmailTheme;
  /** Fallback palette used when emailTheme="auto" (clients without dark-mode support). */
  emailFallbackTheme?: EmailFallbackTheme;
}

export function BookingConfirmationEmail({
  userName,
  bookings,
  paymentIntentId,
  dashboardUrl,
  qrBatches = [],
  emailTheme = "auto",
  emailFallbackTheme = "light",
}: BookingConfirmationProps) {
  const grandTotal = bookings.reduce((s, b) => s + b.totalAmount, 0);
  const siteBase = dashboardUrl.replace(/\/dashboard\/?$/, "");

  const palettes = {
    dark: {
      bg: "#09090b",
      card: "#0c0c0c",
      border: "#27272a",
      textPrimary: "#fafafa",
      textSecondary: "#a3a3a3",
      textTertiary: "#737373",
      textMuted: "#525252",
      link: "#a3a3a3",
      btnBg: "#fafafa",
      btnFg: "#0a0a0a",
    },
    light: {
      bg: "#ffffff",
      card: "#f8fafc",
      border: "rgba(15, 15, 25, 0.12)",
      textPrimary: "#0b0b10",
      textSecondary: "#3f3f46",
      textTertiary: "#61616d",
      textMuted: "#6b7280",
      link: "#3f3f46",
      btnBg: "#0b0b10",
      btnFg: "#ffffff",
    },
  } as const;

  const base =
    emailTheme === "dark"
      ? palettes.dark
      : emailTheme === "light"
        ? palettes.light
        : emailFallbackTheme === "dark"
          ? palettes.dark
          : palettes.light;

  const cssVarPairs = (p: Record<string, string>) =>
    Object.entries(p)
      .map(([k, v]) => `--${k}:${v};`)
      .join("");

  const styleBlock =
    emailTheme === "auto"
      ? `
        .email-root{${cssVarPairs(base)}}
        @media (prefers-color-scheme: dark){
          .email-root{${cssVarPairs(palettes.dark)}}
        }
        @media (prefers-color-scheme: light){
          .email-root{${cssVarPairs(palettes.light)}}
        }
      `
      : `.email-root{${cssVarPairs(base)}}`;

  return (
    <Html>
      <Head>
        <style>{styleBlock}</style>
      </Head>
      <Preview>Booking confirmed — times & entry QR inside</Preview>
      <Tailwind>
        <Body
          className="font-sans email-root"
          style={{ backgroundColor: "var(--bg)", color: "var(--textPrimary)" }}
        >
          <Container className="mx-auto max-w-[520px] py-10 px-5">
            <Section className="mb-8">
              <Text
                className="text-[13px] font-medium tracking-tight m-0"
                style={{ color: "var(--textTertiary)" }}
              >
                EventNexus
              </Text>
            </Section>

            <Heading
              className="text-[26px] font-semibold tracking-tight leading-snug m-0 mb-3"
              style={{ color: "var(--textPrimary)" }}
            >
              You&apos;re booked
            </Heading>
            <Text
              className="text-[15px] leading-relaxed m-0 mb-8"
              style={{ color: "var(--textSecondary)" }}
            >
              Hi {userName} — payment went through. Below are your event times (for calendar apps)
              and entry QR codes where applicable.
            </Text>

            <Hr className="border-[0.5px] my-6" style={{ borderColor: "var(--border)" }} />

            <Text
              className="text-[11px] font-semibold uppercase tracking-tight m-0 mb-4"
              style={{ color: "var(--textTertiary)" }}
            >
              Tickets
            </Text>

            {bookings.map((b, i) => (
              <Row key={i} className="mb-3">
                <Column>
                  <Section
                    className="rounded-lg px-4 py-4"
                    style={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Text
                      className="text-[15px] font-semibold m-0 mb-2 tracking-tight"
                      style={{ color: "var(--textPrimary)" }}
                    >
                      {b.eventTitle}
                    </Text>
                    <Text
                      className="text-[13px] leading-snug m-0 mb-1"
                      style={{ color: "var(--textSecondary)" }}
                    >
                      {b.eventDate}
                    </Text>
                    <Text
                      className="text-[14px] font-medium m-0 mb-1"
                      style={{ color: "var(--textPrimary)" }}
                    >
                      {b.eventTime}
                    </Text>
                    <Text
                      className="text-[11px] font-mono leading-snug m-0 mb-2 break-all"
                      style={{ color: "var(--textMuted)" }}
                    >
                      Start (ISO): {b.eventStartsIso}
                    </Text>
                    <Text className="text-[13px] m-0 mb-4" style={{ color: "var(--textTertiary)" }}>
                      {b.eventLocation}
                    </Text>
                    <Hr className="border-[0.5px] my-3" style={{ borderColor: "var(--border)" }} />
                    <Row>
                      <Column>
                        <Text className="text-[12px] m-0" style={{ color: "var(--textTertiary)" }}>
                          {b.ticketName} × {b.quantity}
                        </Text>
                      </Column>
                      <Column align="right">
                        <Text className="text-[14px] font-medium m-0" style={{ color: "var(--textPrimary)" }}>
                          {b.totalAmount === 0 ? "Free" : `₹${b.totalAmount.toLocaleString("en-IN")}`}
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                </Column>
              </Row>
            ))}

            {qrBatches.length > 0 && (
              <>
                <Text
                  className="text-[11px] font-semibold uppercase tracking-tight m-0 mt-8 mb-4"
                  style={{ color: "var(--textTertiary)" }}
                >
                  Entry — scan at the door
                </Text>
                {qrBatches.map((q, i) => (
                  <Section
                    key={i}
                    className="mb-6 text-center rounded-lg py-5 px-4"
                    style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    <Text
                      className="text-[14px] font-medium m-0 mb-3 tracking-tight"
                      style={{ color: "var(--textPrimary)" }}
                    >
                      {q.eventTitle}
                    </Text>
                    <Img
                      src={`cid:${q.cid}`}
                      width="168"
                      height="168"
                      alt={`Check-in QR — ${q.eventTitle}`}
                      className="mx-auto rounded-md"
                    />
                  </Section>
                ))}
              </>
            )}

            <Section className="my-8 py-4" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <Row>
                <Column>
                  <Text className="text-[14px] m-0" style={{ color: "var(--textSecondary)" }}>
                    Total paid
                  </Text>
                </Column>
                <Column align="right">
                  <Text className="text-[18px] font-semibold m-0 tracking-tight" style={{ color: "var(--textPrimary)" }}>
                    {grandTotal === 0 ? "Free" : `₹${grandTotal.toLocaleString("en-IN")}`}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section className="text-center mb-10">
              <Link
                href={dashboardUrl}
                className="inline-block text-[14px] font-semibold px-5 py-3 rounded-md no-underline tracking-tight"
                style={{ backgroundColor: "var(--btnBg)", color: "var(--btnFg)", display: "inline-block" }}
              >
                Open my tickets
              </Link>
            </Section>

            <Text className="text-[12px] leading-relaxed m-0 mb-2" style={{ color: "var(--textMuted)" }}>
              Reference{" "}
              <span style={{ fontFamily: "monospace", color: "var(--textTertiary)" }}>
                {paymentIntentId}
              </span>
            </Text>
            <Text className="text-[12px] leading-relaxed m-0" style={{ color: "var(--textMuted)" }}>
              Questions?{" "}
              <Link
                href={`${siteBase}/contact`}
                className="underline"
                style={{ color: "var(--link)" }}
              >
                Contact us
              </Link>
            </Text>
            <Text className="text-[11px] m-0 mt-6 tracking-tight" style={{ color: "var(--textTertiary)" }}>
              © {new Date().getFullYear()} EventNexus
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
