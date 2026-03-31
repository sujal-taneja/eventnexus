/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { update: vi.fn() } },
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9, limit: 10, resetInSeconds: 60 }),
}));
vi.mock('@/lib/client-ip', () => ({
  getClientIpFromRequest: () => '127.0.0.1',
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const GOOD_CODE = 'admin-shared-secret';

function req(body: Record<string, unknown> = { code: GOOD_CODE }) {
  return new NextRequest('http://localhost/api/user/become-organizer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/user/become-organizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('BECOME_ORGANIZER', GOOD_CODE);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u1', role: 'ORGANIZER' } as any);
  });

  it('returns 401 when not signed in', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it('returns 409 when user is already ORGANIZER', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'ORGANIZER' } } as any);
    const res = await POST(req());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.role).toBe('ORGANIZER');
  });

  it('returns 409 when user is ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } } as any);
    const res = await POST(req());
    expect(res.status).toBe(409);
  });

  it('upgrades USER to ORGANIZER when code matches BECOME_ORGANIZER', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'USER' } } as any);
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.role).toBe('ORGANIZER');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { role: 'ORGANIZER' },
    });
  });

  it('returns 403 when code is wrong', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'USER' } } as any);
    const res = await POST(req({ code: 'wrong' }));
    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 403 when BECOME_ORGANIZER is unset', async () => {
    vi.stubEnv('BECOME_ORGANIZER', '');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'USER' } } as any);
    const res = await POST(
      new NextRequest('http://localhost/api/user/become-organizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'x' }),
      })
    );
    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
