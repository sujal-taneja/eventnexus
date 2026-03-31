import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="container-main max-w-3xl">
        <div className="glass rounded-xl p-8 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
                Sign in required
              </h1>
              <p className="text-[var(--text-tertiary)] leading-relaxed">
                You need to be signed in to access this page.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link href="/login" className="btn-primary inline-flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Go to login
                </Link>
                <Link href="/events" className="btn-secondary inline-flex items-center justify-center gap-2">
                  Back to Events
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

