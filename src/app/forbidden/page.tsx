import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="container-main max-w-3xl">
        <div className="glass rounded-xl p-8 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
                You&apos;re not allowed to access this
              </h1>
              <p className="text-[var(--text-tertiary)] leading-relaxed">
                Your account doesn&apos;t have the required permissions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link href="/events" className="btn-primary inline-flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Events
                </Link>
                <Link href="/contact" className="btn-secondary inline-flex items-center justify-center gap-2">
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

