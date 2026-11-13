/**
 * Academy wall-clock helpers.
 *
 * The academy operates in Africa/Cairo. Due dates and reminder days are
 * wall-clock concepts and must not drift when a server runs in UTC (MonsterASP)
 * or when Egypt changes DST. Real instants (scheduled sends) are stored as UTC
 * Date values produced here.
 */

export const DEFAULT_ACADEMY_TIMEZONE = "Africa/Cairo";
export const DEFAULT_REMINDER_HOUR = "09:00";

export function isValidDateKey(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || year < 1900 || year > 2999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateKey(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

export function makeDateKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Date key in the academy timezone for a given instant. */
export function dateKeyInTimeZone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_ACADEMY_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addMonthsToDateKey(dateKey: string, months: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  // Clamp the day to the target month (Jan 31 + 1 month = Feb 28/29).
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return makeDateKey(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    Math.min(day, lastDay),
  );
}

/** Whole calendar days from `fromKey` to `toKey` (negative when `to` is earlier). */
export function differenceInDateKeys(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find(part => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/**
 * Converts a wall-clock date + "HH:MM" in `timeZone` to a UTC instant.
 * Two offset probes handle DST transitions without a timezone library.
 */
export function zonedDateTimeToUtc(
  dateKey: string,
  time: string = DEFAULT_REMINDER_HOUR,
  timeZone: string = DEFAULT_ACADEMY_TIMEZONE,
): Date {
  const { year, month, day } = parseDateKey(dateKey);
  const [hourRaw, minuteRaw] = time.split(":").map(Number);
  const hour = Number.isFinite(hourRaw) ? hourRaw : 0;
  const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let offset = timeZoneOffsetMs(new Date(guess), timeZone);
  let result = guess - offset;
  const secondOffset = timeZoneOffsetMs(new Date(result), timeZone);
  if (secondOffset !== offset) {
    offset = secondOffset;
    result = guess - offset;
  }
  return new Date(result);
}

export function formatDateTimeInZone(
  date: Date | string | number,
  timeZone: string = DEFAULT_ACADEMY_TIMEZONE,
  locale = "ar-EG",
): string {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

export function formatDateKeyArabic(dateKey: string): string {
  if (!isValidDateKey(dateKey)) return dateKey || "—";
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "UTC",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateKey;
  }
}

export function currentMonthRange(
  now: Date = new Date(),
  timeZone: string = DEFAULT_ACADEMY_TIMEZONE,
): { fromKey: string; toKey: string; monthKey: string } {
  const todayKey = dateKeyInTimeZone(now, timeZone);
  const { year, month } = parseDateKey(todayKey);
  const fromKey = makeDateKey(year, month, 1);
  const toKey = makeDateKey(year, month + 1, 0);
  return { fromKey, toKey, monthKey: `${year}-${String(month).padStart(2, "0")}` };
}

export function dateKeyToUtcStart(dateKey: string): Date {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function dateKeyToUtcEnd(dateKey: string): Date {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}
