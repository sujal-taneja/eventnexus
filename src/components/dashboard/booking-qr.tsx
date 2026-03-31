"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { QrCode, X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRCodeNode from "qrcode";
import { toast } from "sonner";
import {
  createBookingTicketsPdfBytes,
  type BookingPdfRow,
} from "@/lib/booking-ticket-pdf";

interface BookingQrProps {
  eventTitle: string;
  /** Full QR payload, e.g. `eventnexus:batch:id1,id2` or `eventnexus:booking:id` */
  qrPayload: string;
  /** Short line for the modal (optional). */
  detail?: string;
  // Optional data for the PDF download
  userName?: string;
  userEmail?: string;
  paymentIntentId?: string | null;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  bookingRows?: BookingPdfRow[];
}

export function BookingQr({
  eventTitle,
  qrPayload,
  detail,
  userName,
  userEmail,
  paymentIntentId,
  eventDate,
  eventTime,
  eventLocation,
  bookingRows,
}: BookingQrProps) {
  const [open, setOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const dataUrl = await QRCodeNode.toDataURL(qrPayload, {
        margin: 1,
        width: 320,
      });
      const safeName = eventTitle.replace(/[^\w\d]+/g, "-").slice(0, 40) || "ticket";
      const bytes = createBookingTicketsPdfBytes({
        userName: userName ?? "Attendee",
        userEmail,
        paymentIntentId: paymentIntentId ?? "Unknown",
        events: [
          {
            eventTitle,
            eventDate: eventDate ?? "—",
            eventTime: eventTime ?? "—",
            eventLocation: eventLocation ?? "—",
            qrPayload,
            qrDataUrl: dataUrl,
            rows:
              bookingRows && bookingRows.length > 0
                ? bookingRows
                : detail
                  ? [
                      {
                        bookingId: "—",
                        ticketName: detail,
                        quantity: 1,
                        totalAmount: 0,
                        status: "CONFIRMED",
                      },
                    ]
                  : [
                      {
                        bookingId: "—",
                        ticketName: eventTitle,
                        quantity: 1,
                        totalAmount: 0,
                        status: "CONFIRMED",
                      },
                    ],
          },
        ],
      });

      // jsPDF types sometimes produce `Uint8Array<ArrayBufferLike>`, which TS
      // doesn't accept as a BlobPart. Convert to a real ArrayBuffer slice.
      const arrayBuffer = (bytes.buffer as ArrayBuffer).slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      );
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eventnexus-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not create PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="Show QR code"
        className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors rounded-md hover:bg-white/5"
      >
        <QrCode className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="pointer-events-auto glass border border-[var(--border-subtle)] rounded-2xl p-8 max-w-xs w-full text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[0.9375rem] font-medium text-[var(--text-primary)]">
                    Your e-ticket
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl mx-auto inline-block mb-5">
                  <QRCode value={qrPayload} size={180} />
                </div>

                <p className="text-[0.8125rem] font-medium text-[var(--text-primary)] mb-1 leading-tight">
                  {eventTitle}
                </p>
                {detail ? (
                  <p className="text-[0.75rem] text-[var(--text-muted)] font-mono break-all">
                    {detail}
                  </p>
                ) : null}
                <p className="text-[0.75rem] text-[var(--text-muted)] mt-3">
                  Present this at the venue for check-in.
                </p>

                <button
                  type="button"
                  disabled={pdfLoading}
                  onClick={() => void downloadPdf()}
                  className="mt-5 w-full btn-secondary text-[0.8125rem] py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {pdfLoading ? "Preparing…" : "Download PDF"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
