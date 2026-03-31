import { Resend } from "resend";
import { WelcomeEmail } from "@/emails/welcome";
import { BookingReceiptEmail } from "@/emails/booking-receipt";
import * as React from "react";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.EMAIL_FROM ?? "EventNexus <onboarding@resend.dev>";

export async function sendWelcomeEmail(to: string, name: string) {
  if (!resend) {
    console.warn("No RESEND_API_KEY specified. Welcome email omitted.");
    return;
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: "Welcome to EventNexus!",
      react: React.createElement(WelcomeEmail, { name }),
    });

    if (error) {
      console.error("[RESEND_WELCOME_ERROR]", error);
    }
    return data;
  } catch (err) {
    console.error("[RESEND_WELCOME_EXCEPTION]", err);
  }
}

interface TicketData {
  name: string;
  quantity: number;
  total: number;
}

export async function sendBookingReceiptEmail(
  to: string,
  name: string,
  eventName: string,
  eventDate: Date,
  eventLocation: string,
  bookingId: string,
  tickets: TicketData[],
  totalAmount: number
) {
  if (!resend) {
    console.warn("No RESEND_API_KEY specified. Booking receipt email omitted.");
    return;
  }

  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `Your Tickets: ${eventName}`,
      react: React.createElement(BookingReceiptEmail, {
        name,
        eventName,
        eventDate: formattedDate,
        eventLocation,
        bookingId,
        tickets,
        totalAmount
      }),
    });

    if (error) {
      console.error("[RESEND_RECEIPT_ERROR]", error);
    }
    return data;
  } catch (err) {
    console.error("[RESEND_RECEIPT_EXCEPTION]", err);
  }
}
