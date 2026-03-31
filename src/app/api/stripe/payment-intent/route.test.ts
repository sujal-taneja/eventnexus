/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    paymentIntents: { create: vi.fn().mockResolvedValue({ client_secret: 'pi_secret' }) },
  },
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 4, limit: 5, resetInSeconds: 60 }),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'ev_1',
          organizerId: 'someone_else',
          title: 'Event',
          date: new Date('2026-01-01T00:00:00.000Z'),
          location: 'Somewhere',
        },
      ]),
    },
    ticketType: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'tt_1', price: 599, eventId: 'ev_1' },
        { id: 'tt_2', price: 100, eventId: 'ev_1' },
      ]),
    },
    booking: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops.map((x) => x))),
  },
}));
vi.mock('@/lib/turnstile-server', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}));

// New organizer-comp flow imports server-only helpers; mock them to avoid
// pulling in server-only modules during unit tests.
vi.mock('@/lib/release-locks', () => ({
  releaseUserSeatLocks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/invalidate-search-cache', () => ({
  invalidateSearchCaches: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/async-jobs', () => ({
  scheduleAfterResponse: (fn: () => void | Promise<void>) => void fn(),
}));
vi.mock('@/lib/send-booking-confirmation-job', () => ({
  sendBookingConfirmationJob: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe-server';
import { rateLimit } from '@/lib/rate-limit';

const validItem = {
  ticketTypeId: 'tt_1',
  eventId: 'ev_1',
  eventTitle: 'AI Jutsu Summit',
  ticketName: 'General Admission',
  price: 599,
  quantity: 2,
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/stripe/payment-intent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/stripe/payment-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', email: 'test@test.com' } } as any);
    vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 4, limit: 5, resetInSeconds: 60 });
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({ client_secret: 'pi_secret' } as any);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ items: [validItem] }));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate-limited', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ success: false, remaining: 0, limit: 5, resetInSeconds: 30 });
    const res = await POST(makeRequest({ items: [validItem] }));
    expect(res.status).toBe(429);
  });

  it('returns 400 for empty cart', async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Cart is empty' });
  });

  it('returns 400 for invalid quantity (0)', async () => {
    const res = await POST(makeRequest({ items: [{ ...validItem, quantity: 0 }] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid quantity (11)', async () => {
    const res = await POST(makeRequest({ items: [{ ...validItem, quantity: 11 }] }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when ticket type does not exist in DB', async () => {
    // Mock DB to return empty (ticket not found)
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.ticketType.findMany).mockResolvedValueOnce([]);
    const res = await POST(makeRequest({ items: [validItem] }));
    expect(res.status).toBe(404);
  });

  it('creates a payment intent and returns clientSecret', async () => {
    const res = await POST(makeRequest({ items: [validItem] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clientSecret).toBe('pi_secret');
    // Amount uses DB price (599), not client-supplied price
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'inr',
        amount: 599 * 2 * 100, // 599 (DB price) × 2 × 100 paise
      }),
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^pi:u1:/) })
    );
  });

  it('includes userId in payment intent metadata', async () => {
    await POST(makeRequest({ items: [validItem] }));
    const call = vi.mocked(stripe.paymentIntents.create).mock.calls[0][0];
    expect((call as any).metadata?.userId).toBe('u1');
  });

  it('includes structured items JSON in metadata', async () => {
    await POST(makeRequest({ items: [validItem] }));
    const call = vi.mocked(stripe.paymentIntents.create).mock.calls[0][0];
    const meta = JSON.parse((call as any).metadata?.items ?? '[]');
    expect(meta[0]).toMatchObject({ tid: 'tt_1', eid: 'ev_1', qty: 2, price: 599 });
  });

  it('handles multiple items and sums correctly', async () => {
    const item2 = { ...validItem, ticketTypeId: 'tt_2', price: 100, quantity: 3 };
    await POST(makeRequest({ items: [validItem, item2] }));
    const call = vi.mocked(stripe.paymentIntents.create).mock.calls[0][0];
    // 599*2 + 100*3 = 1198 + 300 = 1498 → 149800 paise
    expect((call as any).amount).toBe(149800);
  });
});
