import { NextRequest, NextResponse } from 'next/server';
import { getSearchSuggestions } from '@/lib/search';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  // Rate-limit: 60 suggestion requests per minute per IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous';

  const { success } = await rateLimit(`${ip}:suggestions`, 60, 60);
  if (!success) {
    return NextResponse.json({ suggestions: [] }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get('q') ?? '';

  try {
    const suggestions = await getSearchSuggestions(q);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[SUGGESTIONS_API]', error);
    return NextResponse.json({ suggestions: [] });
  }
}
