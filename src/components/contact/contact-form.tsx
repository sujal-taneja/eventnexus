"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "";

function randomOp(): { a: number; b: number; op: "add" | "mul"; answer: number; label: string } {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  const useMul = Math.random() > 0.65 && a <= 9 && b <= 9;
  if (useMul) {
    return { a, b, op: "mul", answer: a * b, label: `${a} × ${b}` };
  }
  return { a, b, op: "add", answer: a + b, label: `${a} + ${b}` };
}

export function ContactForm() {
  const [challenge, setChallenge] = useState(randomOp);
  const [captchaInput, setCaptchaInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }, []);

  const refreshChallenge = useCallback(() => {
    setChallenge(randomOp());
    setCaptchaInput("");
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userCaptcha = parseInt(captchaInput, 10);
    if (!Number.isFinite(userCaptcha)) {
      toast.error("Please answer the security question.");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const subject = String(fd.get("subject") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Complete the security verification below the form.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          turnstileToken: TURNSTILE_SITE_KEY ? turnstileToken ?? undefined : undefined,
          captchaA: challenge.a,
          captchaB: challenge.b,
          captchaOp: challenge.op,
          captchaAnswer: userCaptcha,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not send message.");
        if (TURNSTILE_SITE_KEY) resetTurnstile();
        return;
      }
      toast.success("Message sent. We will get back to you soon.");
      form.reset();
      refreshChallenge();
      setCaptchaInput("");
      if (TURNSTILE_SITE_KEY) resetTurnstile();
    } catch {
      toast.error("Network error. Please try again.");
      if (TURNSTILE_SITE_KEY) resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] text-[var(--text-secondary)]" htmlFor="contact-name">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            placeholder="Your name"
            className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-white text-[0.875rem] outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] text-[var(--text-secondary)]" htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-white text-[0.875rem] outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[0.8125rem] text-[var(--text-secondary)]" htmlFor="contact-subject">
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          required
          placeholder="How can we help?"
          className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-white text-[0.875rem] outline-none focus:border-white/20 transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[0.8125rem] text-[var(--text-secondary)]" htmlFor="contact-message">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          placeholder="Tell us more..."
          className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-white text-[0.875rem] outline-none focus:border-white/20 transition-colors resize-none"
        />
      </div>

      {/* Anti-bot: math challenge (always). Cloudflare Turnstile optional via env. */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-3">
        <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wider">
          Security check
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[0.875rem] text-[var(--text-secondary)] tabular-nums">
              What is {challenge.label}?
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="w-24 bg-black/40 border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-white text-[0.875rem] outline-none focus:border-white/20"
              aria-label="Captcha answer"
            />
            <button
              type="button"
              onClick={refreshChallenge}
              className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-md"
              title="New question"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {TURNSTILE_SITE_KEY ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 flex justify-center">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
        </div>
      ) : null}

      <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Sending…
          </>
        ) : (
          "Send message"
        )}
      </button>
    </form>
  );
}
