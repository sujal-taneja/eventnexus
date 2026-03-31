/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    paymentIntents: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findFirst: vi.fn(), create: vi.fn() },
    ticketType: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'tt_1',
          name: 'General',
          price: 599,
          event: { title: 'Test Event', date: new Date(), location: 'Test City' },
        },
      ]),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 2, limit: 3, resetInSeconds: 60 }),
}));
vi.mock('@/lib/release-locks', () => ({ releaseUserSeatLocks: vi.fn() }));
vi.mock('@/lib/invalidate-search-cache', () => ({ invalidateSearchCaches: vi.fn() }));
vi.mock('@/lib/async-jobs', () => ({ scheduleAfterResponse: vi.fn() }));
vi.mock('@/lib/send-booking-confirmation-job', () => ({ sendBookingConfirmationJob: vi.fn() }));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe-server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

const validItem = { ticketTypeId: 'tt_1', eventId: 'ev_1', quantity: 2, price: 599 };
const intentId = 'pi_test123';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/bookings/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/bookings/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as any);
    vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 2, limit: 3, resetInSeconds: 60 });
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: intentId,
      status: 'succeeded',
      metadata: { userId: 'u1', userEmail: '', items: '[]' },
    } as any);
    vi.mocked(stripe.paymentIntents.update).mockResolvedValue({} as any);
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockResolvedValue([
      {
        id: 'b_new',
        eventId: 'ev_1',
        quantity: 2,
        totalAmount: 1198,
        userId: 'u1',
        ticketTypeId: 'tt_1',
        status: 'CONFIRMED',
        paymentIntentId: intentId,
      },
    ] as any);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ paymentIntentId: intentId, items: [validItem] }));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate-limited', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ success: false, remaining: 0, limit: 3, resetInSeconds: 60 });
    const res = await POST(makeRequest({ paymentIntentId: intentId, items: [validItem] }));
    expect(res.status).toBe(429);
  });

  it('returns 400 when paymentIntentId is missing', async () => {
    const res = await POST(makeRequest({ items: [validItem] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when items are empty', async () => {
    const res = await POST(makeRequest({ paymentIntentId: intentId, items: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 402 when payment is not succeeded', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({ id: intentId, status: 'requires_payment_method', metadata: { userId: 'u1' } } as any);
    const res = await POST(makeRequest({ paymentIntentId: intentId, items: [validItem] }));
    expect(res.status).toBe(402);
  });

  it('returns 403 when userId in metadata does not match session', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({ id: intentId, status: 'succeeded', metadata: { userId: 'OTHER_USER' } } as any);
    const res = await POST(makeRequest({ paymentIntentId: intentId, items: [validItem] }));
    expect(res.status).toBe(403);
  });

  it('returns already-confirmed response when booking exists', async () => {
    vi.mocked(prisma.booking.findFirst).mockResolvedValue({ id: 'b_existing' } as any);
    const res = await POST(makeRequest({ paymentIntentId: intentId, items: [validItem] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyConfirmed).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates bookings in a transaction on success', async () => {
    const res = await POST(makeRequest({ paymentIntentId: intentId, items: [validItem] }));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
