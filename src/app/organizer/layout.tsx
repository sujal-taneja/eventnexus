import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, CalendarDays, FileBarChart, LogOut, Settings } from "lucide-react";

export const metadata = { title: "Organizer Dashboard — EventNexus" };

const NAV_LINKS = [
  { name: "Overview", href: "/organizer", icon: LayoutDashboard },
  { name: "Events", href: "/organizer/events", icon: CalendarDays },
  { name: "Reports", href: "/organizer/reports", icon: FileBarChart },
  { name: "Settings", href: "/organizer/settings", icon: Settings },
];

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
    redirect(session ? "/forbidden" : "/unauthorized");
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 glass border-r border-[var(--border-subtle)] pt-20 flex flex-col z-10 hidden md:flex">
        <div className="flex-1 px-4 py-6 space-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.875rem] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <link.icon className="w-4 h-4" />
              {link.name}
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.875rem] font-medium text-red-400 hover:bg-red-400/10 transition-colors"
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
