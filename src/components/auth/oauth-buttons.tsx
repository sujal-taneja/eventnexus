"use client";

import { useState, useCallback } from "react";
import { getCsrfToken, signIn } from "next-auth/react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";

interface Challenge {
  question: string;
  answer: number;
}

function generateChallenge(): Challenge {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  // Randomly pick addition or multiplication (both produce positive results)
  const useMultiply = Math.random() > 0.6 && a <= 6 && b <= 6;
  if (useMultiply) {
    return { question: `${a} × ${b}`, answer: a * b };
  }
  return { question: `${a} + ${b}`, answer: a + b };
}

// GitHub SVG
const GitHubIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 10 0 0 12 2Z"
    />
  </svg>
);

// Google SVG
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

interface OAuthButtonsProps {
  callbackUrl?: string;
  githubLabel?: string;
  googleLabel?: string;
}

export function OAuthButtons({
  callbackUrl = "/events",
  githubLabel = "Continue with GitHub",
  googleLabel = "Continue with Google",
}: OAuthButtonsProps) {
  // Lazy initializer runs generateChallenge() once on mount — no effect needed
  const [challenge, setChallenge] = useState<Challenge>(generateChallenge);
  const [input, setInput] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"github" | "google" | null>(null);
  const [attempts, setAttempts] = useState(0);

  const resetChallenge = useCallback(() => {
    setChallenge(generateChallenge());
    setInput("");
    setError("");
  }, []);

  const handleVerify = () => {
    if (!challenge) return;
    if (parseInt(input, 10) === challenge.answer) {
      setVerified(true);
      setError("");
    } else {
      setAttempts((n) => n + 1);
      setError(
        attempts >= 2
          ? "Still incorrect — refreshing the question."
          : "Incorrect answer. Try again."
      );
      setInput("");
      if (attempts >= 2) {
        resetChallenge();
        setAttempts(0);
      }
    }
  };

  const handleSignIn = async (provider: "github" | "google") => {
    setLoading(provider);
    // Prime CSRF cookie explicitly to avoid missing-csrf races in production.
    await getCsrfToken();
    await signIn(provider, { callbackUrl });
    // signIn redirects so this line is only reached on error
    setLoading(null);
  };

  const btnBase =
    "w-full flex items-center justify-center gap-3 glass px-4 py-2.5 rounded-lg text-[0.875rem] font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]";

  return (
    <div className="space-y-4">
      {/* ── CAPTCHA ─────────────────────────────────────────────────────── */}
      {!verified ? (
        <div className="glass border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wider">
              Quick verification
            </p>
            <button
              type="button"
              onClick={resetChallenge}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="New question"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[0.9375rem] font-medium text-[var(--text-primary)]">
            What is{" "}
            <span className="font-semibold text-[var(--text-primary)]">{challenge?.question}</span>?
          </p>

          <div className="flex gap-2">
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.875rem] outline-none focus:border-[var(--border-hover)] transition-colors placeholder:text-[var(--text-muted)]"
              placeholder="Your answer"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={!input}
              className="btn-secondary px-4 disabled:opacity-40"
            >
              Verify
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-[0.75rem]">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[0.8125rem]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Verification passed — sign in below.</span>
        </div>
      )}

      {/* ── OAuth buttons ────────────────────────────────────────────────── */}
      <div
        className={`space-y-3 transition-all duration-300 ${
          !verified ? "opacity-40 pointer-events-none select-none" : ""
        }`}
        aria-hidden={!verified}
      >
        <button
          type="button"
          onClick={() => handleSignIn("github")}
          disabled={!verified || loading !== null}
          className={btnBase}
        >
          {loading === "github" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GitHubIcon />
          )}
          {githubLabel}
        </button>

        <button
          type="button"
          onClick={() => handleSignIn("google")}
          disabled={!verified || loading !== null}
          className={btnBase}
        >
          {loading === "google" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {googleLabel}
        </button>
      </div>
    </div>
  );
}
