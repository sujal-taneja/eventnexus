/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    webhooks: {
      constructEventAsync: vi.fn(),
    },
    paymentIntents: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/send-booking-confirmation-job', () => ({
  sendBookingConfirmationJob: vi.fn(),
}));

vi.mock('@/lib/release-locks', () => ({
  releaseUserSeatLocks: vi.fn(),
}));

vi.mock('@/lib/invalidate-search-cache', () => ({
  invalidateSearchCaches: vi.fn(),
}));

vi.mock('@/lib/async-jobs', () => ({
  scheduleAfterResponse: vi.fn((fn: () => void) => void fn()),
}));

import { POST } from './route';
import { stripe } from '@/lib/stripe-server';
import { prisma } from '@/lib/prisma';

const WEBHOOK_SECRET = 'whsec_test';

function makeRequest(body: string, sig: string) {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': sig,
      'content-type': 'application/json',
    },
    body,
  });
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', WEBHOOK_SECRET);
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'u@example.com',
      name: 'Test',
    } as any);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      {
        id: 'b1',
        eventId: 'ev_1',
        quantity: 2,
        totalAmount: 1000,
        ticketType: { name: 'GA' },
        event: {
          title: 'Concert',
          date: new Date(),
          location: 'Mumbai',
        },
      },
    ] as any);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const res = await POST(makeRequest('{}', 'sig_x'));
    expect(res.status).toBe(500);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    vi.mocked(stripe.webhooks.constructEventAsync).mockRejectedValue(
      new Error('Invalid signature')
    );
    const res = await POST(makeRequest('{}', 'bad_sig'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid signature');
  });

  it('creates bookings on payment_intent.succeeded', async () => {
    const itemsMeta = JSON.stringify([{ tid: 'tt_1', eid: 'ev_1', qty: 2, price: 500 }]);
    const event = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test',
          status: 'succeeded',
          metadata: { userId: 'u1', items: itemsMeta },
        },
      },
    };
    vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValue(event as any);

    const res = await POST(makeRequest(JSON.stringify(event), 'valid_sig'));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('is idempotent — skips booking creation if booking already exists', async () => {
    vi.mocked(prisma.booking.findFirst).mockResolvedValue({ id: 'existing' } as any);
    const itemsMeta = JSON.stringify([{ tid: 'tt_1', eid: 'ev_1', qty: 1, price: 200 }]);
    const event = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_existing', metadata: { userId: 'u1', items: itemsMeta } } },
    };
    vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValue(event as any);

    const res = await POST(makeRequest(JSON.stringify(event), 'valid_sig'));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('marks bookings REFUNDED on charge.refunded', async () => {
    const event = {
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_refund123' } },
    };
    vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValue(event as any);

    const res = await POST(makeRequest(JSON.stringify(event), 'valid_sig'));
    expect(res.status).toBe(200);
    expect(prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { paymentIntentId: 'pi_refund123' },
      data: { status: 'REFUNDED' },
    });
  });

  it('returns 200 for unhandled event types (no-op)', async () => {
    const event = { type: 'customer.created', data: { object: {} } };
    vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValue(event as any);

    const res = await POST(makeRequest(JSON.stringify(event), 'valid_sig'));
    expect(res.status).toBe(200);
  });
});
