"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Role = "USER" | "ORGANIZER" | "ADMIN" | null;

interface OrganizerCtaProps {
  userRole: Role;
  isSignedIn: boolean;
}

export function OrganizerCta({ userRole, isSignedIn }: OrganizerCtaProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"PENDING" | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [organiserCode, setOrganiserCode] = useState("");

  if (userRole === "ORGANIZER" || userRole === "ADMIN") {
    return (
      <Link href="/organizer" className="btn-primary inline-flex items-center gap-2 w-fit">
        <LayoutDashboard className="w-3.5 h-3.5" />
        Organiser dashboard
      </Link>
    );
  }

  if (isSignedIn) {
    if (upgraded) {
      return (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-emerald-400 text-[0.875rem] font-medium">
            <CheckCircle2 className="w-4 h-4" />
            You are now an organiser. Redirecting…
          </div>
        </div>
      );
    }

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        try {
          const res = await fetch("/api/user/organizer-request", { method: "GET" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return;
          if (!cancelled) {
            setRequestStatus(data.status === "PENDING" ? "PENDING" : null);
          }
        } catch {
          // ignore
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    const handleUpgrade = async () => {
      if (!organiserCode.trim()) {
        toast.error("Enter the organiser code from your admin.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/user/become-organizer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: organiserCode.trim() }),
        });
        const data = await res.json();

        if (res.status === 409) {
          toast.success("You are already an organiser.");
          router.push("/organizer");
          return;
        }

        if (!res.ok) {
          toast.error(data.error ?? "Something went wrong.");
          return;
        }

        setUpgraded(true);
        toast.success("Welcome, organiser! Refreshing your session…");
        setTimeout(() => router.refresh(), 800);
        setTimeout(() => router.push("/organizer"), 1400);
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const handleRequestApproval = async () => {
      setRequesting(true);
      try {
        const res = await fetch("/api/user/organizer-request", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Could not send request to admin.");
          return;
        }
        setRequestStatus("PENDING");
        toast.success("Request sent to admin. You will be contacted soon.");
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setRequesting(false);
      }
    };

    const handleCancelRequest = async () => {
      setRequesting(true);
      try {
        const res = await fetch("/api/user/organizer-request", { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Could not cancel request.");
          return;
        }
        setRequestStatus(null);
        toast.success("Request cancelled.");
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setRequesting(false);
      }
    };

    return (
      <div className="flex flex-col gap-3 max-w-md mx-auto items-center text-center">
        <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">
          Choose one path: request admin approval, or enter the secret organiser
          code your admin shared.
        </p>
        <form
          className="w-full flex flex-col gap-3 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void handleUpgrade();
          }}
        >
          <input
            type="password"
            autoComplete="off"
            value={organiserCode}
            onChange={(e) => setOrganiserCode(e.target.value)}
            placeholder="Organiser code"
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-[0.875rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-hover)]"
          />

          <button
            type="submit"
            disabled={loading || requesting}
            className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Upgrading…
              </>
            ) : (
              <>
                Become an organiser <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {requestStatus === "PENDING" ? (
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={requesting || loading}
              className="btn-secondary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {requesting ? "Cancelling request…" : "Request pending — cancel request"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestApproval}
              disabled={requesting || loading}
              className="btn-secondary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {requesting ? "Sending request…" : "Send request to admin"}
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={`/login?callbackUrl=${encodeURIComponent("/organizers")}`}
        className="btn-primary inline-flex items-center gap-2"
      >
        Log in to apply <ArrowRight className="w-3.5 h-3.5" />
      </Link>
      <Link
        href="/pricing"
        className="btn-secondary inline-flex items-center gap-2"
      >
        See plans <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
