/**
 * Dump all database tables to db-backup.json BEFORE a schema migration.
 * Uses raw SQL so it is schema-agnostic and safe to run against the OLD schema.
 *
 * Run:  npx tsx scripts/dump-data.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type Rows = Record<string, unknown>[];

async function q(sql: string): Promise<Rows> {
  return prisma.$queryRawUnsafe<Rows>(sql);
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, "\"\"")}"`;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await q(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '${tableName}'
    LIMIT 1
  `);
  return rows.length > 0;
}

async function dumpTable(tableName: string): Promise<Rows> {
  if (!(await tableExists(tableName))) return [];

  const cols = await q(`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${tableName}'
    ORDER BY ordinal_position
  `);

  const safeColumns = cols
    .filter((c) => c.udt_name !== "tsvector")
    .map((c) => quoteIdent(String(c.column_name)));

  if (safeColumns.length === 0) return [];

  return q(`SELECT ${safeColumns.join(", ")} FROM ${quoteIdent(tableName)}`);
}

async function main() {
  console.log("📦 Dumping database to db-backup.json …\n");

  const data = {
    users: await dumpTable("User"),
    accounts: await dumpTable("Account"),
    sessions: await dumpTable("Session"),
    verificationTokens: await dumpTable("VerificationToken"),
    events: await dumpTable("Event"),
    ticketTypes: await dumpTable("TicketType"),
    bookings: await dumpTable("Booking"),
  };

  const outPath = path.join(process.cwd(), "db-backup.json");
  fs.writeFileSync(
    outPath,
    // BigInt → string so JSON.stringify doesn't throw
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? String(v) : v), 2)
  );

  console.log("Tables backed up:");
  for (const [table, rows] of Object.entries(data)) {
    console.log(`  ${table.padEnd(20)} ${(rows as Rows).length} rows`);
  }
  console.log(`\n✅  Saved to: ${outPath}`);
  console.log("\nNext steps:");
  console.log("  1. npx prisma db push --force-reset   (drops all tables, applies new schema)");
  console.log("  2. npx tsx scripts/restore-data.ts    (re-inserts all rows)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
