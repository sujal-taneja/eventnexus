import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User, LayoutDashboard, Ticket } from "lucide-react";

export const metadata = { title: "Profile — EventNexus" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/profile");

  const u = session.user;
  const role = u.role ?? "USER";

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="container-main max-w-2xl">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Account</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-8">
          Your profile
        </h1>

        <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)] space-y-6">
          <div className="flex items-center gap-4">
            {u.image ? (
              <Image
                src={u.image}
                alt={u.name || "Profile"}
                width={64}
                height={64}
                className="rounded-full border border-[var(--border-subtle)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 border border-[var(--border-subtle)] flex items-center justify-center">
                <User className="w-7 h-7 text-[var(--text-muted)]" />
              </div>
            )}
            <div>
              <p className="text-lg font-medium text-white">{u.name ?? "Guest"}</p>
              <p className="text-[0.875rem] text-[var(--text-tertiary)]">{u.email}</p>
              <p className="text-[0.75rem] text-[var(--text-muted)] mt-1 uppercase tracking-wider">
                Role · {role}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 text-[0.8125rem]">
              <Ticket className="w-3.5 h-3.5" />
              Bookings & tickets
            </Link>
            {(role === "ORGANIZER" || role === "ADMIN") && (
              <Link href="/organizer" className="btn-secondary inline-flex items-center gap-2 text-[0.8125rem]">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Organiser dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
