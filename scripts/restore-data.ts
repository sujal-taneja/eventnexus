/**
 * Restore all rows from db-backup.json into a freshly-migrated database.
 * Run this AFTER `npx prisma db push --force-reset`.
 *
 * Handles schema upgrades:
 *   • Event.timeZone  — defaults to "Asia/Kolkata" if missing from backup
 *   • ContactMessage  — new table, nothing to restore
 *   • Booking.checkedInAt — already nullable, kept as-is
 *
 * Run:  npx tsx scripts/restore-data.ts
 */
import { PrismaClient, Role, BookingStatus } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function asDate(v: unknown): Date {
  return new Date(v as string);
}
function asDateOrNull(v: unknown): Date | null {
  return v ? new Date(v as string) : null;
}
function asFloat(v: unknown): number {
  return typeof v === "number" ? v : parseFloat(v as string);
}
function asInt(v: unknown): number {
  return typeof v === "number" ? v : parseInt(v as string, 10);
}

async function main() {
  const backupPath = path.join(process.cwd(), "db-backup.json");
  if (!fs.existsSync(backupPath)) {
    console.error("❌  db-backup.json not found. Run dump-data.ts first.");
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any[]> = JSON.parse(
    fs.readFileSync(backupPath, "utf-8")
  );

  console.log("♻️  Restoring database from db-backup.json …\n");

  // ── 1. Users (no foreign-key deps) ──────────────────────────────────────────
  if (data.users?.length) {
    for (const u of data.users) {
      await prisma.user.create({
        data: {
          id: u.id,
          name: u.name ?? null,
          email: u.email ?? null,
          emailVerified: asDateOrNull(u.emailVerified),
          image: u.image ?? null,
          role: (u.role as Role) ?? Role.USER,
          createdAt: asDate(u.createdAt),
          updatedAt: asDate(u.updatedAt),
        },
      });
    }
    console.log(`  ✓ users            ${data.users.length}`);
  }

  // ── 2. Accounts (→ User) ────────────────────────────────────────────────────
  if (data.accounts?.length) {
    for (const a of data.accounts) {
      await prisma.account.create({
        data: {
          id: a.id,
          userId: a.userId,
          type: a.type,
          provider: a.provider,
          providerAccountId: a.providerAccountId,
          refresh_token: a.refresh_token ?? null,
          access_token: a.access_token ?? null,
          expires_at: a.expires_at ? asInt(a.expires_at) : null,
          token_type: a.token_type ?? null,
          scope: a.scope ?? null,
          id_token: a.id_token ?? null,
          session_state: a.session_state ?? null,
        },
      });
    }
    console.log(`  ✓ accounts         ${data.accounts.length}`);
  }

  // ── 3. Sessions (→ User) ────────────────────────────────────────────────────
  if (data.sessions?.length) {
    for (const s of data.sessions) {
      await prisma.session.create({
        data: {
          id: s.id,
          sessionToken: s.sessionToken,
          userId: s.userId,
          expires: asDate(s.expires),
        },
      });
    }
    console.log(`  ✓ sessions         ${data.sessions.length}`);
  }

  // ── 4. VerificationTokens ───────────────────────────────────────────────────
  if (data.verificationTokens?.length) {
    for (const vt of data.verificationTokens) {
      await prisma.verificationToken.create({
        data: {
          identifier: vt.identifier,
          token: vt.token,
          expires: asDate(vt.expires),
        },
      });
    }
    console.log(`  ✓ verificationTokens ${data.verificationTokens.length}`);
  }

  // ── 5. Events (→ User organizer) ────────────────────────────────────────────
  // NEW FIELD: timeZone — default "Asia/Kolkata" for all legacy rows
  if (data.events?.length) {
    for (const e of data.events) {
      await prisma.event.create({
        data: {
          id: e.id,
          title: e.title,
          description: e.description,
          date: asDate(e.date),
          timeZone: (e.timeZone as string | undefined) ?? "Asia/Kolkata",
          location: e.location,
          imageUrl: e.imageUrl,
          category: e.category,
          organizerId: e.organizerId,
          isActive: e.isActive ?? true,
          createdAt: asDate(e.createdAt),
          updatedAt: asDate(e.updatedAt),
        },
      });
    }
    console.log(`  ✓ events           ${data.events.length}`);
  }

  // ── 6. TicketTypes (→ Event) ────────────────────────────────────────────────
  if (data.ticketTypes?.length) {
    for (const tt of data.ticketTypes) {
      await prisma.ticketType.create({
        data: {
          id: tt.id,
          name: tt.name,
          price: asFloat(tt.price),
          capacity: asInt(tt.capacity),
          eventId: tt.eventId,
          createdAt: asDate(tt.createdAt),
          updatedAt: asDate(tt.updatedAt),
        },
      });
    }
    console.log(`  ✓ ticketTypes      ${data.ticketTypes.length}`);
  }

  // ── 7. Bookings (→ User, Event, TicketType) ─────────────────────────────────
  if (data.bookings?.length) {
    for (const b of data.bookings) {
      await prisma.booking.create({
        data: {
          id: b.id,
          userId: b.userId,
          eventId: b.eventId,
          ticketTypeId: b.ticketTypeId,
          quantity: asInt(b.quantity),
          totalAmount: asFloat(b.totalAmount),
          status: (b.status as BookingStatus) ?? BookingStatus.CONFIRMED,
          paymentIntentId: b.paymentIntentId ?? null,
          checkedInAt: asDateOrNull(b.checkedInAt),
          createdAt: asDate(b.createdAt),
          updatedAt: asDate(b.updatedAt),
        },
      });
    }
    console.log(`  ✓ bookings         ${data.bookings.length}`);
  }

  console.log("\n✅  Restore complete!");
  console.log("   ContactMessage table starts empty — that's correct.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("\n❌  Restore failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
