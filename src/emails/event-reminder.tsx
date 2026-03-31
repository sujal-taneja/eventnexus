import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

import type { EmailFallbackTheme, EmailTheme } from "@/types/email-theme";

export interface EventReminderEmailProps {
  userName: string;
  bookingId: string;
  eventTitle: string;
  /** Human-readable local date + time. */
  eventWhen: string;
  /** ISO-8601 start — calendar / AI extraction. */
  eventStartsIso: string;
  eventLocation: string;
  ticketSummary: string;
  dashboardUrl: string;
  /** Inline CID ref for QR (mailer attaches PNG). */
  qrCid?: string;
  emailTheme?: EmailTheme;
  emailFallbackTheme?: EmailFallbackTheme;
}

export function EventReminderEmail({
  userName,
  bookingId,
  eventTitle,
  eventWhen,
  eventStartsIso,
  eventLocation,
  ticketSummary,
  dashboardUrl,
  qrCid,
  emailTheme = "auto",
  emailFallbackTheme = "light",
}: EventReminderEmailProps) {
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
      <Preview>Tomorrow: {eventTitle}</Preview>
      <Tailwind>
        <Body
          className="font-sans email-root"
          style={{ backgroundColor: "var(--bg)", color: "var(--textPrimary)" }}
        >
          <Container className="mx-auto max-w-[520px] py-10 px-5">
            <Section className="mb-6">
              <Text
                className="text-[13px] font-medium tracking-tight m-0"
                style={{ color: "var(--textTertiary)" }}
              >
                EventNexus
              </Text>
            </Section>

            <Heading
              className="text-[22px] font-semibold tracking-tight leading-snug m-0 mb-2"
              style={{ color: "var(--textPrimary)" }}
            >
              Tomorrow: {eventTitle}
            </Heading>
            <Text
              className="text-[15px] leading-relaxed m-0 mb-6"
              style={{ color: "var(--textSecondary)" }}
            >
              Hi {userName} — quick reminder about your tickets.
            </Text>

            <Section
              className="rounded-lg px-4 py-4 mb-6"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <Text
                className="text-[11px] font-semibold uppercase tracking-tight m-0 mb-1"
                style={{ color: "var(--textTertiary)" }}
              >
                When
              </Text>
              <Text className="text-[14px] m-0 mb-1" style={{ color: "var(--textPrimary)" }}>
                {eventWhen}
              </Text>
              <Text
                className="text-[11px] font-mono leading-snug m-0 mb-4 break-all"
                style={{ color: "var(--textMuted)" }}
              >
                Start (ISO): {eventStartsIso}
              </Text>
              <Text
                className="text-[11px] font-semibold uppercase tracking-tight m-0 mb-1"
                style={{ color: "var(--textTertiary)" }}
              >
                Where
              </Text>
              <Text className="text-[14px] m-0 mb-4" style={{ color: "var(--textSecondary)" }}>
                {eventLocation}
              </Text>
              <Text
                className="text-[11px] font-semibold uppercase tracking-tight m-0 mb-1"
                style={{ color: "var(--textTertiary)" }}
              >
                Tickets
              </Text>
              <Text className="text-[14px] m-0 mb-2" style={{ color: "var(--textSecondary)" }}>
                {ticketSummary}
              </Text>
              {qrCid ? (
                <Section className="mt-4 text-center">
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-tight m-0 mb-2"
                    style={{ color: "var(--textSecondary)" }}
                  >
                    Your QR
                  </Text>
                  <Img
                    src={`cid:${qrCid}`}
                    width="144"
                    height="144"
                    alt={`Check-in QR — ${eventTitle}`}
                    className="mx-auto rounded-md"
                  />
                </Section>
              ) : null}
              <Text
                className="text-[11px] font-mono leading-snug m-0 mt-4 break-all"
                style={{ color: "var(--textMuted)" }}
              >
                Booking ID: {bookingId}
              </Text>
            </Section>

            <Section className="text-center mb-8">
              <Link
                href={dashboardUrl}
                className="inline-block text-[14px] font-semibold px-5 py-3 rounded-md no-underline tracking-tight"
                style={{ backgroundColor: "var(--btnBg)", color: "var(--btnFg)", display: "inline-block" }}
              >
                View tickets & QR
              </Link>
            </Section>

            <Hr className="border-[0.5px] my-6" style={{ borderColor: "var(--border)" }} />

            <Text className="text-[12px] m-0" style={{ color: "var(--textMuted)" }}>
              <Link
                href={`${siteBase}/contact`}
                className="underline"
                style={{ color: "var(--link)" }}
              >
                Help
              </Link>
              {" · "}
              {siteBase.replace(/^https?:\/\//, "")}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
