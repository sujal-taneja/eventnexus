"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CameraOff } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

type Props = { eventId: string; eventTitle: string };

export function EventCheckInScanner({ eventId, eventTitle }: Props) {
  const [active, setActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const dedupeRef = useRef<{ raw: string; at: number }>({ raw: "", at: 0 });

  const stop = async () => {
    const s = scannerRef.current;
    if (s && startedRef.current) {
      try {
        await s.stop();
        await s.clear();
      } catch {
        /* ignore */
      }
      startedRef.current = false;
    }
    scannerRef.current = null;
    setActive(false);
  };

  useEffect(() => {
    return () => {
      void stop();
    };
  }, []);

  const start = async () => {
    const regionId = "organizer-qr-reader";
    await stop();
    const s = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = s;
    try {
      await s.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 260, height: 260 } },
        async (decoded) => {
          const now = Date.now();
          if (dedupeRef.current.raw === decoded && now - dedupeRef.current.at < 3200) return;
          dedupeRef.current = { raw: decoded, at: now };
          try {
            const res = await fetch(`/api/organizer/events/${eventId}/check-in`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ raw: decoded }),
            });
            const data = await res.json();
            if (!res.ok) {
              toast.error(data.error ?? "Check-in failed");
              return;
            }
            toast.success(`Checked in ${data.checkedIn} booking line(s)`);
          } catch {
            toast.error("Network error");
          }
        },
        () => {}
      );
      startedRef.current = true;
      setActive(true);
    } catch (e) {
      console.error(e);
      toast.error("Could not start camera. Check permissions and HTTPS.");
      scannerRef.current = null;
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-2 text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-1">
          Check-in
        </h1>
        <p className="text-[var(--text-secondary)] text-[0.875rem]">
          {eventTitle} — scan attendee QR from their email or dashboard.
        </p>
      </div>

      <div className="glass-card overflow-hidden rounded-xl border border-[var(--border-subtle)]">
        <div id="organizer-qr-reader" className="w-full min-h-[260px] bg-black/30" />
      </div>

      <div className="flex flex-wrap gap-3">
        {!active ? (
          <button type="button" onClick={() => void start()} className="btn-primary inline-flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Start camera
          </button>
        ) : (
          <button type="button" onClick={() => void stop()} className="btn-secondary inline-flex items-center gap-2">
            <CameraOff className="w-4 h-4" />
            Stop camera
          </button>
        )}
      </div>

      <p className="text-[0.8125rem] text-[var(--text-muted)]">
        Each successful scan marks all booking rows in that batch as checked in for this event only.
      </p>
    </div>
  );
}
