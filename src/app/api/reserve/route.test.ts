/**
 * Tests for POST /api/reserve and DELETE /api/reserve.
 *
 * All external dependencies (auth, Prisma, Redis, rate-limiter, Next headers)
 * are mocked so the tests are fully unit-level and run without a running server.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations must come before any import that transitively loads them ──
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ticketType: { findUnique: vi.fn() },
    booking: { aggregate: vi.fn() },
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    incrby: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('@/lib/turnstile-server', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

// Avoid instantiating real rate-limit logic (which needs Redis) in isolation
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 9,
    limit: 10,
    resetInSeconds: 60,
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

// ── Import route handlers after mocks are set up ────────────────────────────
import { POST, DELETE } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { rateLimit } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/turnstile-server';

// ── Shared test fixtures ─────────────────────────────────────────────────────
const MOCK_SESSION = {
  user: { id: 'user_abc', email: 'test@example.com', role: 'USER' },
} as any;

const MOCK_TICKET = {
  id: 'tkt_1',
  name: 'General Admission',
  price: 500,
  capacity: 100,
  eventId: 'evt_1',
} as any;

function makeRequest(body: object, method = 'POST') {
  return new Request(`http://localhost/api/reserve`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── POST /api/reserve ────────────────────────────────────────────────────────
describe('POST /api/reserve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION);
    vi.mocked(prisma.ticketType.findUnique).mockResolvedValue(MOCK_TICKET);
    vi.mocked(prisma.booking.aggregate).mockResolvedValue({
      _sum: { quantity: 0 },
    } as any);
    vi.mocked(redis.get).mockResolvedValue('0');
    vi.mocked(redis.incrby).mockResolvedValue(1);
    vi.mocked(redis.set).mockResolvedValue('OK');
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      remaining: 9,
      limit: 10,
      resetInSeconds: 60,
    });
  });

  // ── Authentication ────────────────────────────────────────────────────────

  it('returns 401 when the user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 1 }] }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when turnstile verification fails', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 1 }] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Security verification failed/);
    expect(verifyTurnstileToken).toHaveBeenCalled();
  });

  it('passes turnstileToken from request body into verifier', async () => {
    const token = 'turnstile_test_token';
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 1 }], turnstileToken: token }));
    expect(res.status).toBe(200);
    expect(verifyTurnstileToken).toHaveBeenCalledWith(token);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it('returns 400 when tickets array is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when tickets array is empty', async () => {
    const res = await POST(makeRequest({ tickets: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No tickets selected');
  });

  it('returns 400 when quantity is 0', async () => {
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 0 }] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Quantity must be between/);
  });

  it('returns 400 when quantity exceeds the maximum of 10', async () => {
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 11 }] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Quantity must be between/);
  });

  it('returns 400 when quantity is a non-integer float', async () => {
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 1.5 }] }));
    expect(res.status).toBe(400);
  });

  // ── Ticket existence ──────────────────────────────────────────────────────

  it('returns 404 when the ticket type does not exist', async () => {
    vi.mocked(prisma.ticketType.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_ghost', quantity: 1 }] }));
    expect(res.status).toBe(404);
  });

  // ── Capacity checks ───────────────────────────────────────────────────────

  it('returns 400 when confirmed bookings have already filled capacity', async () => {
    vi.mocked(prisma.booking.aggregate).mockResolvedValue({
      _sum: { quantity: 100 }, // at capacity
    } as any);
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 1 }] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Not enough seats/);
  });

  it('returns 400 when Redis locks + confirmed bookings exceed capacity', async () => {
    vi.mocked(prisma.booking.aggregate).mockResolvedValue({
      _sum: { quantity: 95 },
    } as any);
    vi.mocked(redis.get).mockResolvedValue('4'); // 95 confirmed + 4 locked + 2 requested > 100
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 2 }] }));
    expect(res.status).toBe(400);
  });

  it('accepts a request that exactly fills remaining capacity', async () => {
    vi.mocked(prisma.booking.aggregate).mockResolvedValue({
      _sum: { quantity: 95 },
    } as any);
    vi.mocked(redis.get).mockResolvedValue('0');
    // 95 + 5 = 100, exactly at capacity — should succeed
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 5 }] }));
    expect(res.status).toBe(200);
  });

  // ── Rate limiting ────────────────────────────────────────────────────────

  it('returns 429 when the rate limit is exceeded', async () => {
    vi.mocked(rateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 10,
      resetInSeconds: 42,
    });
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 1 }] }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    const body = await res.json();
    expect(body.error).toMatch(/Too many requests/);
  });

  it('rate limits under concurrent load (capacity for 10 req)', async () => {
    let calls = 0;
    vi.mocked(rateLimit).mockImplementation(async () => {
      calls++;
      const success = calls <= 10;
      return {
        success,
        remaining: success ? 10 - calls : 0,
        limit: 10,
        resetInSeconds: 60,
      };
    });

    const reqs = Array.from({ length: 15 }, () =>
      POST(
        makeRequest({
          tickets: [{ id: 'tkt_1', quantity: 1 }],
          turnstileToken: 'turnstile_test_token',
        })
      )
    );

    const res = await Promise.all(reqs);
    const statuses = res.map((r) => r.status);

    // First 10 should succeed, remaining 5 should be rate-limited.
    expect(statuses.filter((s) => s === 200).length).toBe(10);
    expect(statuses.filter((s) => s === 429).length).toBe(5);
  });

  // ── Happy path ───────────────────────────────────────────────────────────

  it('returns 200 and sets Redis locks on success', async () => {
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 3 }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(redis.incrby).toHaveBeenCalledWith('ticket:tkt_1:locked', 3);
    expect(redis.set).toHaveBeenCalledWith(
      'user_lock:user_abc:ticket:tkt_1',
      3,
      'EX',
      600
    );
  });

  it('processes multiple ticket types in a single request', async () => {
    vi.mocked(prisma.ticketType.findUnique)
      .mockResolvedValueOnce(MOCK_TICKET)
      .mockResolvedValueOnce({ ...MOCK_TICKET, id: 'tkt_2', name: 'VIP' } as any);

    const res = await POST(
      makeRequest({
        tickets: [
          { id: 'tkt_1', quantity: 2 },
          { id: 'tkt_2', quantity: 1 },
        ],
      })
    );

    expect(res.status).toBe(200);
    expect(redis.incrby).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledTimes(2);
  });

  it('includes X-RateLimit-Remaining header on success', async () => {
    const res = await POST(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 1 }] }));
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('9');
  });
});

// ── DELETE /api/reserve ──────────────────────────────────────────────────────
describe('DELETE /api/reserve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(MOCK_SESSION);
    vi.mocked(redis.get).mockResolvedValue('2'); // user holds a lock for qty 2
    vi.mocked(redis.set).mockResolvedValue('OK');
    vi.mocked(redis.del).mockResolvedValue(1);
  });

  // ── Authentication ────────────────────────────────────────────────────────

  it('returns 401 when the user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 2 }] }, 'DELETE'));
    expect(res.status).toBe(401);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it('returns 400 when tickets array is empty', async () => {
    const res = await DELETE(makeRequest({ tickets: [] }, 'DELETE'));
    expect(res.status).toBe(400);
  });

  // ── Lock release ──────────────────────────────────────────────────────────

  it('decrements the global lock counter and deletes the user lock key', async () => {
    vi.mocked(redis.get)
      .mockResolvedValueOnce('2') // user_lock: user had 2 locked
      .mockResolvedValueOnce('5'); // ticket:tkt_1:locked global counter

    const res = await DELETE(
      makeRequest({ tickets: [{ id: 'tkt_1', quantity: 2 }] }, 'DELETE')
    );

    expect(res.status).toBe(200);
    // Global counter: 5 - 2 = 3
    expect(redis.set).toHaveBeenCalledWith('ticket:tkt_1:locked', 3);
    expect(redis.del).toHaveBeenCalledWith('user_lock:user_abc:ticket:tkt_1');
  });

  it('does not go below 0 for the global lock counter', async () => {
    vi.mocked(redis.get)
      .mockResolvedValueOnce('10') // user thinks they have 10 locked
      .mockResolvedValueOnce('3'); // but global says only 3 (clock skew / manual delete)

    await DELETE(makeRequest({ tickets: [{ id: 'tkt_1', quantity: 10 }] }, 'DELETE'));

    expect(redis.set).toHaveBeenCalledWith('ticket:tkt_1:locked', 0); // clamped to 0
  });

  it('skips a ticket where the user has no active lock', async () => {
    vi.mocked(redis.get).mockResolvedValue(null); // no user lock

    const res = await DELETE(
      makeRequest({ tickets: [{ id: 'tkt_1', quantity: 2 }] }, 'DELETE')
    );

    expect(res.status).toBe(200);
    expect(redis.del).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('releases locks for multiple ticket types', async () => {
    vi.mocked(redis.get)
      .mockResolvedValueOnce('2') // user_lock tkt_1
      .mockResolvedValueOnce('5') // global tkt_1
      .mockResolvedValueOnce('1') // user_lock tkt_2
      .mockResolvedValueOnce('4'); // global tkt_2

    const res = await DELETE(
      makeRequest(
        {
          tickets: [
            { id: 'tkt_1', quantity: 2 },
            { id: 'tkt_2', quantity: 1 },
          ],
        },
        'DELETE'
      )
    );

    expect(res.status).toBe(200);
    expect(redis.del).toHaveBeenCalledTimes(2);
  });

  it('returns success message on completion', async () => {
    const res = await DELETE(
      makeRequest({ tickets: [{ id: 'tkt_1', quantity: 2 }] }, 'DELETE')
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Locks released');
  });
});
