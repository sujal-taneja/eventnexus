export const DEFAULT_EVENT_TIME_ZONE = "Asia/Kolkata";

export function formatEventDateTime(opts: {
  date: Date;
  timeZone?: string | null;
  locale?: string;
}): { dateLong: string; timeShort: string; whenShort: string; startsIso: string } {
  const { date, timeZone, locale } = opts;
  const tz = (timeZone ?? "").trim() || DEFAULT_EVENT_TIME_ZONE;
  const loc = locale ?? "en-IN";

  const dateLong = new Intl.DateTimeFormat(loc, {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timeShort = new Intl.DateTimeFormat(loc, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);

  const whenShort = new Intl.DateTimeFormat(loc, {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);

  return {
    dateLong,
    timeShort,
    whenShort,
    startsIso: date.toISOString(), // absolute UTC instant for calendar links
  };
}

