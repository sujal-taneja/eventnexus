import "server-only";

/** Normalize for deduplication (case-insensitive). */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Valid unique recipient list; same address (case-insensitive) appears once. */
export function uniqueBookingConfirmationEmails(
  accountEmail: string | undefined | null,
  receiptEmail: string | undefined | null
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string | undefined | null) => {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) return;
    const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!basic) return;
    const key = norm(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  add(accountEmail);
  add(receiptEmail);
  return out;
}
