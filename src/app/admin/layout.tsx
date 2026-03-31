import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, CalendarDays, LogOut } from "lucide-react";

export const metadata = { title: "Admin Panel — EventNexus" };

const NAV_LINKS = [
  { name: "Global Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Users & Roles", href: "/admin/users", icon: Users },
  { name: "Platform Events", href: "/admin/events", icon: CalendarDays },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Root-level Admin verification
  if (!session || session.user.role !== "ADMIN") {
    redirect(session ? "/forbidden" : "/unauthorized");
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 glass border-r border-red-500/10 pt-20 flex flex-col z-10 hidden md:flex">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
           <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold">Admin Panel</span>
        </div>
        <div className="flex-1 px-4 py-6 space-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.875rem] font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
            >
              <link.icon className="w-4 h-4" />
              {link.name}
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.875rem] font-medium text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
