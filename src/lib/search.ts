/**
 * Core search logic for EventNexus.
 *
 * Combines full-text relevance ranking, optional fuzzy matching on titles/locations,
 * and facet filters (category, price, city/area). Results are cached in Redis briefly
 * to keep repeated browsing snappy.
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { redis } from './redis';

// ── Public types ─────────────────────────────────────────────────────────────

export type EventWithDetails = Prisma.EventGetPayload<{
  include: { tickets: true; organizer: { select: { name: true } } };
}>;

export type SortOption = 'date_asc' | 'date_desc' | 'price_asc' | 'price_desc';

export interface SearchParams {
  q?: string;
  category?: string;
  /** Filter events whose location contains this string (case-insensitive). */
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

// ── searchEvents ─────────────────────────────────────────────────────────────

export async function searchEvents(
  params: SearchParams
): Promise<EventWithDetails[]> {
  const {
    q,
    category,
    city,
    minPrice,
    maxPrice,
    sort = 'date_asc',
    page = 1,
    limit = 12,
  } = params;

  const cleanQ = q?.trim();
  const cleanCity = city?.trim();
  const cacheKey = `cache:search:${JSON.stringify({ cleanQ, cleanCity, category, minPrice, maxPrice, sort, page, limit })}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      // Dates were serialized to ISO strings — restore them so callers can
      // call .toLocaleDateString() etc. without a new Date() wrapper.
      const parsed: EventWithDetails[] = JSON.parse(cached);
      return parsed.map((e) => ({ ...e, date: new Date(e.date) }));
    }
  } catch {
    // Redis unavailable; continue without cache
  }

  // ── Step 1: Full-text search (get ordered IDs) ────────────────────────────
  let orderedIds: string[] | null = null;

  if (cleanQ && cleanQ.length > 0) {
    const ilikePattern = `%${cleanQ}%`;
    // Similarity threshold for pg_trgm fuzzy matching (0–1, higher = stricter)
    const TRGM_THRESHOLD = 0.15;

    try {
      // Use stored search_vector column (GIN-indexed) for fast full-text search,
      // combined with pg_trgm similarity for typo-tolerant fuzzy matching.
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT e.id,
               ts_rank(e.search_vector, websearch_to_tsquery('english', ${cleanQ}))
                 + similarity(e.title, ${cleanQ}) * 0.5 AS rank
        FROM   "Event" e
        WHERE  e."isActive" = true
          AND  (
                 -- Full-text match using stored GIN-indexed vector
                 e.search_vector @@ websearch_to_tsquery('english', ${cleanQ})
                 -- Fuzzy trigram match on title (catches typos)
                 OR similarity(e.title, ${cleanQ}) > ${TRGM_THRESHOLD}
                 -- Fallback ILIKE for short queries / single chars
                 OR e.title    ILIKE ${ilikePattern}
                 OR e.location ILIKE ${ilikePattern}
                 OR e.category ILIKE ${ilikePattern}
               )
        ORDER  BY rank DESC, e.date ASC
      `;
      orderedIds = rows.map((r) => r.id);
    } catch {
      // pg_trgm not available — fall back to pure full-text + ILIKE
      try {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT e.id,
                 ts_rank(e.search_vector, websearch_to_tsquery('english', ${cleanQ})) AS rank
          FROM   "Event" e
          WHERE  e."isActive" = true
            AND  (
                   e.search_vector @@ websearch_to_tsquery('english', ${cleanQ})
                   OR e.title    ILIKE ${ilikePattern}
                   OR e.location ILIKE ${ilikePattern}
                   OR e.category ILIKE ${ilikePattern}
                 )
          ORDER  BY rank DESC, e.date ASC
        `;
        orderedIds = rows.map((r) => r.id);
      } catch {
        // Last resort: plain ILIKE (no index, but always works)
        const rows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Event"
          WHERE  "isActive" = true
            AND  (title ILIKE ${ilikePattern} OR location ILIKE ${ilikePattern} OR category ILIKE ${ilikePattern})
          ORDER  BY date ASC
        `;
        orderedIds = rows.map((r) => r.id);
      }
    }

    if (orderedIds.length === 0) return [];
  }

  // ── Step 2: Prisma ORM query with facets ─────────────────────────────────
  const priceFilter: Prisma.EventWhereInput =
    minPrice !== undefined || maxPrice !== undefined
      ? {
          tickets: {
            some: {
              price: {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
              },
            },
          },
        }
      : {};

  const ormOrderBy: Prisma.EventOrderByWithRelationInput =
    sort === 'date_desc'
      ? { date: 'desc' }
      : { date: 'asc' }; // price sort is handled in JS below

  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      ...(orderedIds !== null ? { id: { in: orderedIds } } : {}),
      ...(category && category !== 'all'
        ? { category: { equals: category, mode: 'insensitive' } }
        : {}),
      ...(cleanCity
        ? { location: { contains: cleanCity, mode: 'insensitive' as const } }
        : {}),
      ...priceFilter,
    },
    include: {
      tickets: true,
      organizer: { select: { name: true } },
    },
    // When searching, we re-order by FTS relevance in JS, so skip ORM sort.
    ...(orderedIds === null
      ? { orderBy: ormOrderBy, take: limit, skip: (page - 1) * limit }
      : {}),
  });

  // ── Step 3: Re-sort + paginate when FTS was used ──────────────────────────
  let result = events;

  if (orderedIds !== null) {
    // Preserve FTS relevance order, then apply JS-level price sort if asked
    result = orderedIds
      .map((id) => events.find((e) => e.id === id))
      .filter((e): e is EventWithDetails => e !== undefined);

    if (sort === 'price_asc' || sort === 'price_desc') {
      result = sortByPrice(result, sort);
    }

    result = result.slice((page - 1) * limit, page * limit);
  } else if (sort === 'price_asc' || sort === 'price_desc') {
    result = sortByPrice(result, sort);
  }

  // ── Cache ────────────────────────────────────────────────────────────────
  try {
    await redis.set(
      cacheKey,
      JSON.stringify(result, (_, val) =>
        val instanceof Date ? val.toISOString() : val
      ),
      'EX',
      120
    );
  } catch {
    // best-effort
  }

  return result;
}

function sortByPrice(
  events: EventWithDetails[],
  sort: 'price_asc' | 'price_desc'
): EventWithDetails[] {
  return [...events].sort((a, b) => {
    const minA = a.tickets.length ? Math.min(...a.tickets.map((t) => t.price)) : 0;
    const minB = b.tickets.length ? Math.min(...b.tickets.map((t) => t.price)) : 0;
    return sort === 'price_asc' ? minA - minB : minB - minA;
  });
}

// ── getSearchSuggestions ──────────────────────────────────────────────────────

export async function getSearchSuggestions(q: string): Promise<string[]> {
  const cleanQ = q.trim();
  if (cleanQ.length < 2) return [];

  const cacheKey = `cache:suggestions:${cleanQ.toLowerCase().slice(0, 30)}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const prefix = `${cleanQ}%`;
  const rows = await prisma.$queryRaw<{ text: string }[]>`
    (SELECT title    AS text FROM "Event" WHERE "isActive" = true AND title    ILIKE ${prefix} ORDER BY date ASC LIMIT 4)
    UNION
    (SELECT DISTINCT location AS text FROM "Event" WHERE "isActive" = true AND location ILIKE ${prefix} ORDER BY location LIMIT 2)
    LIMIT 5
  `;

  const suggestions = rows.map((r) => r.text);

  try {
    await redis.set(cacheKey, JSON.stringify(suggestions), 'EX', 300);
  } catch {}

  return suggestions;
}

// ── getEventCategories ────────────────────────────────────────────────────────

export async function getEventCategories(): Promise<string[]> {
  const cacheKey = 'cache:categories';

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const rows = await prisma.$queryRaw<{ category: string }[]>`
    SELECT DISTINCT category FROM "Event" WHERE "isActive" = true ORDER BY category ASC
  `;

  const categories = rows.map((r) => r.category);

  try {
    await redis.set(cacheKey, JSON.stringify(categories), 'EX', 300);
  } catch {}

  return categories;
}
