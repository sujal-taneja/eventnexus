"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

type AppError = Error & { digest?: string };

export default function Error({
  error,
  reset,
}: {
  error: AppError;
  reset: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="container-main max-w-3xl">
        <div
          className={`glass rounded-xl p-8 border border-[var(--border-subtle)] transition-opacity duration-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
                Something went wrong
              </h1>
              <p className="text-[var(--text-tertiary)] leading-relaxed">
                We hit an unexpected error. You can try again, or go back to safety.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="btn-primary inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try again
                </button>
                <Link
                  href="/events"
                  className="btn-secondary inline-flex items-center justify-center gap-2"
                >
                  Back to Events
                </Link>
              </div>

              {error?.digest ? (
                <p className="mt-5 text-[0.75rem] text-[var(--text-muted)] break-all">
                  Error reference: {error.digest}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

