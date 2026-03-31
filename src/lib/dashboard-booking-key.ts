/** Stable React key for a booking batch — safe to import from Server Components. */
export function dashboardBookingBatchKey(b: {
  paymentIntentId: string | null;
  eventId: string;
  id: string;
}): string {
  if (b.paymentIntentId) return `${b.paymentIntentId}::${b.eventId}`;
  return b.id;
}
