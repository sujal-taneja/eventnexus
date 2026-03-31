/**
 * prisma/setup-search.ts
 *
 * Runs once to enable pg_trgm, add a stored tsvector column with a GIN index,
 * and create a trigger to keep it up to date automatically.
 *
 * Run with:  npx ts-node --project tsconfig.json prisma/setup-search.ts
 * Or:        npx tsx prisma/setup-search.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Setting up full-text search indexes...");

  // 1. Enable pg_trgm extension (for fuzzy / LIKE-optimised search)
  await prisma.$executeRawUnsafe(
    `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  );
  console.log("  ✓ pg_trgm extension enabled");

  // 2. Add stored tsvector column to Event table (if not already present)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Event"
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(location, '') || ' ' ||
        coalesce(category, '')
      )
    ) STORED;
  `);
  console.log("  ✓ search_vector column added");

  // 3. GIN index on the stored tsvector (fastest for full-text lookups)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_event_search_vector
    ON "Event" USING GIN(search_vector);
  `);
  console.log("  ✓ GIN index on search_vector created");

  // 4. Trigram index on title (for fast ILIKE / fuzzy queries)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_event_title_trgm
    ON "Event" USING GIN(title gin_trgm_ops);
  `);
  console.log("  ✓ Trigram GIN index on title created");

  // 5. Trigram index on location (for location-based fuzzy search)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_event_location_trgm
    ON "Event" USING GIN(location gin_trgm_ops);
  `);
  console.log("  ✓ Trigram GIN index on location created");

  console.log("\n✅ Search indexes set up successfully!");
  console.log("   Full-text search and fuzzy matching are now index-backed.");
}

main()
  .catch((e) => {
    console.error("❌ Search setup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
