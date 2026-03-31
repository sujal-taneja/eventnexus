import Link from "next/link";
import { FileDown } from "lucide-react";

export default function OrganizerReportsPage() {
  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
          Reports
        </h1>
        <p className="text-[var(--text-secondary)] text-[0.9375rem]">
          Download financial summaries for your events (confirmed bookings only).
        </p>
      </div>
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-medium text-[var(--text-primary)] mb-1">Revenue by event</h2>
          <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
            CSV with ticket counts and revenue per event you organise.
          </p>
        </div>
        <a
          href="/api/organizer/reports/revenue"
          className="btn-primary inline-flex items-center gap-2 shrink-0"
          download
        >
          <FileDown className="w-4 h-4" />
          Download CSV
        </a>
      </div>
      <Link href="/organizer" className="text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
        ← Back to overview
      </Link>
    </div>
  );
}
