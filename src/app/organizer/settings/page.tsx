import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function OrganizerSettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
          Settings
        </h1>
        <p className="text-[var(--text-secondary)] text-[0.9375rem]">
          Account basics for your organiser session.
        </p>
      </div>
      <div className="glass-card p-6 space-y-3 text-[0.875rem]">
        <p className="text-[var(--text-tertiary)]">Signed in as</p>
        <p className="text-[var(--text-primary)] font-medium">{session?.user?.email}</p>
        <p className="text-[var(--text-muted)] pt-2">
          Profile and billing preferences can be extended here later.
        </p>
      </div>
      <Link href="/organizer" className="text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
        ← Back to overview
      </Link>
    </div>
  );
}
