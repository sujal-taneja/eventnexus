import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/search', () => ({
  getSearchSuggestions: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59, limit: 60, resetInSeconds: 60 }),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { getSearchSuggestions } from '@/lib/search';
import { rateLimit } from '@/lib/rate-limit';

function makeRequest(q: string) {
  return new NextRequest(
    `http://localhost/api/search/suggestions?q=${encodeURIComponent(q)}`,
    { headers: { 'x-forwarded-for': '127.0.0.1' } }
  );
}

describe('GET /api/search/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 59, limit: 60, resetInSeconds: 60 });
  });

  it('returns suggestions for a valid query', async () => {
    vi.mocked(getSearchSuggestions).mockResolvedValue(['AI Jutsu Summit', 'Shibuya Nights']);

    const res = await GET(makeRequest('ai'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toEqual(['AI Jutsu Summit', 'Shibuya Nights']);
    expect(getSearchSuggestions).toHaveBeenCalledWith('ai');
  });

  it('returns empty array for a blank query', async () => {
    vi.mocked(getSearchSuggestions).mockResolvedValue([]);

    const res = await GET(makeRequest(''));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toEqual([]);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ success: false, remaining: 0, limit: 60, resetInSeconds: 42 });

    const res = await GET(makeRequest('tech'));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.suggestions).toEqual([]);
  });

  it('returns empty array gracefully when getSearchSuggestions throws', async () => {
    vi.mocked(getSearchSuggestions).mockRejectedValue(new Error('DB connection lost'));

    const res = await GET(makeRequest('konoha'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toEqual([]);
  });

  it('passes the full query string to getSearchSuggestions', async () => {
    vi.mocked(getSearchSuggestions).mockResolvedValue([]);

    await GET(makeRequest('Jujutsu Tech'));
    expect(getSearchSuggestions).toHaveBeenCalledWith('Jujutsu Tech');
  });
});
