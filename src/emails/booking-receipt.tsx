import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface TicketProps {
  name: string;
  quantity: number;
  total: number;
}

interface BookingReceiptEmailProps {
  name: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  bookingId: string;
  tickets: TicketProps[];
  totalAmount: number;
  qrCodeUrl?: string; // TBD: Week 8 functionality
}

export const BookingReceiptEmail = ({
  name,
  eventName,
  eventDate,
  eventLocation,
  bookingId,
  tickets,
  totalAmount,
  qrCodeUrl,
}: BookingReceiptEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your tickets for {eventName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>EventNexus</Text>
          </Section>
          
          <Section style={bodySection}>
            <Text style={badge}>CONFIRMED COMPLETED</Text>
            <Heading style={h1}>You&apos;re Going to {eventName}!</Heading>
            <Text style={text}>
              Hi {name}, your booking has been confirmed and payment was successful. 
              We&apos;ve secured your seats for the upcoming event.
            </Text>
            
            <Section style={eventInfo}>
              <Text style={label}>WHEN</Text>
              <Text style={val}>{eventDate}</Text>
              <Text style={label}>WHERE</Text>
              <Text style={val}>{eventLocation}</Text>
              <Text style={label}>BOOKING ID</Text>
              <Text style={val}>{bookingId}</Text>
            </Section>

            {qrCodeUrl ? (
              <Section style={{ textAlign: "center", margin: "30px 0" }}>
                <Img 
                  src={qrCodeUrl}
                  width="180"
                  height="180"
                  alt={`QR Code for ${bookingId}`}
                  style={{ borderRadius: "12px", border: "4px solid white" }}
                />
                <Text style={{ ...text, fontSize: "12px", marginTop: "12px" }}>Have this QR code ready for scanning at the entrance.</Text>
              </Section>
            ) : (
              <Section style={{ textAlign: "center", margin: "30px 0", padding: "30px", border: "1px dashed #3f3f46", borderRadius: "12px" }}>
                 <Text style={{ ...text, margin: 0 }}>QR Generation processing... Please show this email at the door.</Text>
              </Section>
            )}

            <Section style={invoice}>
              <Text style={invoiceTitle}>Order Summary</Text>
              {tickets.map((t, idx) => (
                <div key={idx} style={invoiceRow}>
                  <Text style={invoiceKey}>{t.quantity}x {t.name}</Text>
                  <Text style={invoiceVal}>₹{t.total}</Text>
                </div>
              ))}
              <div style={invoiceTotalRow}>
                 <Text style={invoiceTotalKey}>Total Paid</Text>
                 <Text style={invoiceTotalVal}>₹{totalAmount}</Text>
              </div>
            </Section>

            <Section style={buttonContainer}>
              <Link href={`https://eventnexus.app/dashboard`} style={button}>
                View My Tickets
              </Link>
            </Section>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              Need help? Reply to this email or visit our Help Center.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} EventNexus Inc. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingReceiptEmail;

const main = {
  backgroundColor: "#000000",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: "40px 0",
};

const container = {
  margin: "0 auto",
  padding: "0 20px",
  width: "580px",
  maxWidth: "100%",
};

const header = {
  padding: "20px 0",
};

const logo = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0",
  letterSpacing: "-0.5px",
};

const bodySection = {
  backgroundColor: "#111111",
  border: "1px solid #333333",
  borderRadius: "12px",
  padding: "40px",
};

const badge = {
  color: "#34d399",
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "1px",
  margin: "0 0 12px 0",
};

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "32px",
  margin: "0 0 20px 0",
  letterSpacing: "-0.5px",
};

const text = {
  color: "#a1a1aa",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 20px 0",
};

const eventInfo = {
  backgroundColor: "#18181b",
  borderRadius: "8px",
  padding: "20px",
  margin: "0 0 30px 0",
  border: "1px solid #27272a",
};

const label = {
  color: "#71717a",
  fontSize: "11px",
  fontWeight: "600",
  margin: "0 0 4px 0",
  letterSpacing: "1px",
};

const val = {
  color: "#e4e4e7",
  fontSize: "15px",
  margin: "0 0 16px 0",
};

const invoice = {
  margin: "0 0 30px 0",
};

const invoiceTitle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const invoiceRow = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid #27272a",
  padding: "12px 0",
};

const invoiceKey = {
  color: "#a1a1aa",
  fontSize: "14px",
  margin: "0",
  display: "inline-block",
  width: "80%"
};

const invoiceVal = {
  color: "#ffffff",
  fontSize: "14px",
  margin: "0",
  display: "inline-block",
  textAlign: "right" as const,
  width: "20%"
};

const invoiceTotalRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "16px 0 0 0",
};

const invoiceTotalKey = {
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0",
  display: "inline-block",
  width: "80%"
};

const invoiceTotalVal = {
  color: "#34d399",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
  display: "inline-block",
  textAlign: "right" as const,
  width: "20%"
};

const buttonContainer = {
  padding: "10px 0 10px 0",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  color: "#000000",
  fontSize: "14px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  padding: "30px 0",
};

const footerText = {
  color: "#52525b",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0 0 8px 0",
  textAlign: "center" as const,
};
