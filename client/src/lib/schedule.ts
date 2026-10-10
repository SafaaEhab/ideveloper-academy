// @ts-check
/**
 * جدول المواعيد — the scheduling maths behind the admin calendar.
 *
 * A group's timetable is a repeating weekly slot (`academy_group_sessions`),
 * optionally overridden on individual dates (`academy_session_exceptions`).
 * The calendar never stores one row per date: it expands the recurrence into
 * occurrences on the fly, which is what makes a weekly class show up on every
 * Saturday without anybody re-entering it.
 *
 * Everything here is pure and free of React and date-library dependencies so it
 * can be unit tested directly. Dates are handled as *local wall clock* values on
 * purpose — a timetable must not shift a day when the admin's timezone does.
 */

export const MINUTES_PER_DAY = 24 * 60;

/** A recurring weekly slot, as returned by `admin.groupSessions`. */
export type ScheduleSession = {
  id: number;
  groupId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  groupName: string;
  groupLevel: string | null;
};

/** A one-off change for a single date, as returned by `admin.sessionExceptions`. */
export type ScheduleException = {
  id: number;
  sessionId: number;
  dateKey: string;
  kind: "cancelled" | "moved";
  moveToDate: string | null;
  startTime: string | null;
  endTime: string | null;
};

/** One concrete dated session produced by expanding the recurrence. */
export type Occurrence = {
  /** Stable React key and drag payload: `<sessionId>@<dateKey>`. */
  key: string;
  sessionId: number;
  /** Set when this occurrence comes from a one-off override. */
  exceptionId: number | null;
  groupId: number;
  groupName: string;
  groupLevel: string | null;
  dateKey: string;
  /** 0 = Sunday … 6 = Saturday, matching `Date#getDay`. */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  /** True when a "moved" exception shifted this occurrence. */
  moved: boolean;
};

// ── Time strings ───────────────────────────────────────────────────────────

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** `"17:30"` → `1050`. Returns `null` for anything unparseable. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = TIME_PATTERN.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes past midnight → `"17:30"`. Wraps at 24h so drags can spill over. */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(minutes)));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** `"17:00"` → `"5:00 PM"`. Keeps the grid readable for a mixed audience. */
export function formatTime(time: string): string {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time;
  const hours24 = Math.floor(minutes / 60);
  const suffix = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${pad(minutes % 60)} ${suffix}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `"17:00"` → `"5:00 PM – 6:30 PM"`, or just the start when they match. */
export function formatTimeRange(startTime: string, endTime: string): string {
  return startTime === endTime
    ? formatTime(startTime)
    : `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/** `"17:00"`–`"18:30"` → `"1h 30m"`. */
export function formatDuration(startTime: string, endTime: string): string {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return "";
  const minutes = end - start;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** Shifts a start time forward, keeping the session's own length. */
export function shiftTimeRange(
  startTime: string,
  endTime: string,
  deltaMinutes: number,
): { startTime: string; endTime: string } {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) {
    return { startTime, endTime };
  }
  const length = Math.max(15, end - start);
  return {
    startTime: minutesToTime(start + deltaMinutes),
    endTime: minutesToTime(start + deltaMinutes + length),
  };
}

// ── Local calendar dates ───────────────────────────────────────────────────

/** Local `YYYY-MM-DD`. Never uses `toISOString`, which would shift by timezone. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Inverse of `toDateKey` — local midnight on the named day. */
export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** Midnight on the first day of `date`'s week, honouring the configured start. */
export function startOfWeek(date: Date, weekStartsOn = 0): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() - weekStartsOn + 7) % 7;
  return addDays(start, -offset);
}

export function isSameDay(left: Date, right: Date): boolean {
  return toDateKey(left) === toDateKey(right);
}

/** Every day from `from` to `to`, both inclusive. Returns local midnights. */
export function eachDate(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The seven day columns of a week view, starting on `weekStartsOn`. */
export function weekDays(anchor: Date, weekStartsOn = 0): Date[] {
  const start = startOfWeek(anchor, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** The 6×7 grid a month view draws, padded to whole weeks. */
export function monthGrid(anchor: Date, weekStartsOn = 0): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first, weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

// ── Expanding the recurrence ───────────────────────────────────────────────

export function occurrenceKey(sessionId: number, dateKey: string): string {
  return `${sessionId}@${dateKey}`;
}

function exceptionKey(sessionId: number, dateKey: string): string {
  return `${sessionId}|${dateKey}`;
}

/**
 * Turns the recurring slots plus their one-off overrides into dated occurrences
 * between `from` and `to`.
 *
 * Three passes, in order:
 *  1. Emit every natural recurrence that has no exception.
 *  2. Emit "moved" exceptions that keep the original day, using the new time.
 *  3. Emit "moved" exceptions that jump to another day on a date that would
 *     otherwise have no session for this series.
 *
 * Cancelled dates emit nothing at all, and a cancellation on the destination
 * date wins over a move onto it — you cannot resurrect a class that was dropped.
 */
export function buildOccurrences(
  sessions: ScheduleSession[],
  exceptions: ScheduleException[],
  from: Date,
  to: Date,
): Occurrence[] {
  if (sessions.length === 0) return [];

  const byId = new Map(sessions.map(session => [session.id, session]));
  const byDateKey = new Map<string, ScheduleException>();
  for (const exception of exceptions) {
    byDateKey.set(
      exceptionKey(exception.sessionId, exception.dateKey),
      exception,
    );
  }

  const occurrences: Occurrence[] = [];
  const emit = (
    session: ScheduleSession,
    date: Date,
    startTime: string,
    endTime: string,
    exception: ScheduleException | null,
  ) => {
    const dateKey = toDateKey(date);
    occurrences.push({
      key: occurrenceKey(session.id, dateKey),
      sessionId: session.id,
      exceptionId: exception?.id ?? null,
      groupId: session.groupId,
      groupName: session.groupName,
      groupLevel: session.groupLevel,
      dateKey,
      dayOfWeek: date.getDay(),
      startTime,
      endTime,
      location: session.location,
      notes: session.notes,
      moved: exception?.kind === "moved",
    });
  };

  const dates = eachDate(from, to);
  // Where pass 1 already drew an occurrence, so pass 3 never doubles one up.
  const rendered = new Set<string>();

  // Pass 1 + 2: the recurrence itself, with same-day overrides applied.
  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const dateKey = toDateKey(date);
    for (const session of sessions) {
      if (session.dayOfWeek !== dayOfWeek) continue;
      const key = exceptionKey(session.id, dateKey);
      const exception = byDateKey.get(key);
      if (!exception) {
        emit(session, date, session.startTime, session.endTime, null);
        rendered.add(key);
        continue;
      }
      if (exception.kind === "cancelled") continue;
      // A move to another day is emitted by pass 3 instead.
      if (exception.moveToDate && exception.moveToDate !== dateKey) continue;
      emit(
        session,
        date,
        exception.startTime ?? session.startTime,
        exception.endTime ?? session.endTime,
        exception,
      );
      rendered.add(key);
    }
  }

  // Pass 3: moves that land on a day this series would not naturally occur.
  for (const exception of exceptions) {
    if (exception.kind !== "moved" || !exception.moveToDate) continue;
    const session = byId.get(exception.sessionId);
    if (!session) continue;
    const dateKey = exception.moveToDate;
    if (dateKey < toDateKey(from) || dateKey > toDateKey(to)) continue;
    // Moving onto a day the series already runs there is a no-op.
    if (rendered.has(exceptionKey(session.id, dateKey))) continue;
    // A cancellation on the destination date wins: you cannot resurrect a class
    // that was dropped.
    if (byDateKey.get(exceptionKey(session.id, dateKey))?.kind === "cancelled") {
      continue;
    }
    emit(
      session,
      fromDateKey(dateKey),
      exception.startTime ?? session.startTime,
      exception.endTime ?? session.endTime,
      exception,
    );
  }

  return occurrences.sort(
    (left, right) =>
      left.dateKey.localeCompare(right.dateKey) ||
      left.startTime.localeCompare(right.startTime) ||
      left.groupName.localeCompare(right.groupName),
  );
}

/**
 * Occurrence keys that sit on top of another one. Two groups cannot teach the
 * same room at the same moment, so the grid rings these in amber.
 */
export function findConflicts(occurrences: Occurrence[]): Set<string> {
  const byDay = new Map<string, Occurrence[]>();
  for (const occurrence of occurrences) {
    const list = byDay.get(occurrence.dateKey);
    if (list) list.push(occurrence);
    else byDay.set(occurrence.dateKey, [occurrence]);
  }

  const conflicts = new Set<string>();
  for (const dayOccurrences of byDay.values()) {
    if (dayOccurrences.length < 2) continue;
    for (let i = 0; i < dayOccurrences.length; i += 1) {
      for (let j = i + 1; j < dayOccurrences.length; j += 1) {
        const a = dayOccurrences[i];
        const b = dayOccurrences[j];
        const aStart = timeToMinutes(a.startTime);
        const aEnd = timeToMinutes(a.endTime);
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        if (aStart === null || aEnd === null) continue;
        if (bStart === null || bEnd === null) continue;
        // Touching endpoints are not a clash: 16:00–17:00 next to 17:00–18:00.
        if (aStart < bEnd && bStart < aEnd) {
          conflicts.add(a.key);
          conflicts.add(b.key);
        }
      }
    }
  }
  return conflicts;
}

/** Collapses overlapping blocks so they can share a column without clipping. */
export function layoutOverlaps(
  occurrences: Occurrence[],
): { occurrence: Occurrence; column: number; columns: number }[] {
  const ordered = [...occurrences].sort(
    (left, right) =>
      left.startTime.localeCompare(right.startTime) ||
      left.endTime.localeCompare(right.endTime),
  );
  const placed: { occurrence: Occurrence; column: number; columns: number }[] = [];
  let cluster: { occurrence: Occurrence; column: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const width = Math.max(1, ...cluster.map(item => item.column + 1));
    for (const item of cluster) {
      placed.push({ ...item, columns: width });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const occurrence of ordered) {
    const start = timeToMinutes(occurrence.startTime) ?? 0;
    const end = timeToMinutes(occurrence.endTime) ?? 0;
    if (cluster.length > 0 && start >= clusterEnd) flush();
    const taken = new Set(cluster.map(item => item.column));
    let column = 0;
    while (taken.has(column)) column += 1;
    cluster.push({ occurrence, column });
    clusterEnd = Math.max(clusterEnd, end);
  }
  if (cluster.length > 0) flush();
  return placed;
}

// ── Group colours ──────────────────────────────────────────────────────────

/**
 * Solid, high-contrast fills.
 *
 * The first pass used a 15% tint with a soft border, which on the dark calendar
 * read as a faded smudge — the outline disappeared into the grid and the label
 * had nothing to sit against. Each chip now carries a deeper fill, a full-bright
 * label, and a border strong enough to draw the block's edge.
 */
const PALETTE = [
  { name: "blue", chip: "bg-blue-500/20 text-blue-800 dark:bg-blue-500/35 dark:text-white border-blue-600/50 dark:border-blue-300/70", solid: "bg-blue-500/20", bar: "bg-blue-500", dot: "bg-blue-500" },
  { name: "emerald", chip: "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/35 dark:text-white border-emerald-600/50 dark:border-emerald-300/70", solid: "bg-emerald-500/20", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { name: "amber", chip: "bg-amber-500/25 text-amber-900 dark:bg-amber-500/35 dark:text-white border-amber-600/60 dark:border-amber-300/70", solid: "bg-amber-500/25", bar: "bg-amber-500", dot: "bg-amber-500" },
  { name: "violet", chip: "bg-violet-500/20 text-violet-800 dark:bg-violet-500/35 dark:text-white border-violet-600/50 dark:border-violet-300/70", solid: "bg-violet-500/20", bar: "bg-violet-500", dot: "bg-violet-500" },
  { name: "rose", chip: "bg-rose-500/20 text-rose-800 dark:bg-rose-500/35 dark:text-white border-rose-600/50 dark:border-rose-300/70", solid: "bg-rose-500/20", bar: "bg-rose-500", dot: "bg-rose-500" },
  { name: "cyan", chip: "bg-cyan-500/20 text-cyan-800 dark:bg-cyan-500/35 dark:text-white border-cyan-600/50 dark:border-cyan-300/70", solid: "bg-cyan-500/20", bar: "bg-cyan-500", dot: "bg-cyan-500" },
  { name: "orange", chip: "bg-orange-500/25 text-orange-900 dark:bg-orange-500/35 dark:text-white border-orange-600/60 dark:border-orange-300/70", solid: "bg-orange-500/25", bar: "bg-orange-500", dot: "bg-orange-500" },
  { name: "fuchsia", chip: "bg-fuchsia-500/20 text-fuchsia-800 dark:bg-fuchsia-500/35 dark:text-white border-fuchsia-600/50 dark:border-fuchsia-300/70", solid: "bg-fuchsia-500/20", bar: "bg-fuchsia-500", dot: "bg-fuchsia-500" },
];

export type GroupColor = (typeof PALETTE)[number];

/** Stable colour per group so the legend and the grid never disagree. */
export function buildColorMap(groupIds: number[]): Map<number, GroupColor> {
  const map = new Map<number, GroupColor>();
  groupIds.forEach((groupId, index) => {
    map.set(groupId, PALETTE[index % PALETTE.length]);
  });
  return map;
}

export function colorFor(groupId: number, colors: Map<number, GroupColor>): GroupColor {
  return colors.get(groupId) ?? PALETTE[0];
}

// ── Importing the old free-text schedule ───────────────────────────────────

const DAY_ALIASES: Record<string, number> = {
  sunday: 0, sun: 0, "الاحد": 0, "الأحد": 0,
  monday: 1, mon: 1, "الاثنين": 1, "الإثنين": 1,
  tuesday: 2, tue: 2, tues: 2, "الثلاثاء": 2,
  wednesday: 3, wed: 3, "الأربعاء": 3, "الاربعاء": 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, "الخميس": 4,
  friday: 5, fri: 5, "الجمعة": 5,
  saturday: 6, sat: 6, "السبت": 6,
};

/** Arabic comma, semicolon and tatweel become plain separators first. */
const ARABIC_SEPARATORS = /[،؛ـ]/g;

/**
 * `"Saturday, Tuesday"` → `[6, 2]`. Day order is sorted so the result is stable,
 * and unrecognised words are skipped rather than failing the whole list.
 */
export function parseScheduleDays(text: string | null | undefined): number[] {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .replace(ARABIC_SEPARATORS, ",")
    .replace(/[إأ]/g, "ا");
  const found = new Set<number>();
  for (const token of normalized.split(/[^a-z0-9؀-ۿ]+/)) {
    const day = DAY_ALIASES[token];
    if (day !== undefined) found.add(day);
  }
  return [...found].sort((left, right) => left - right);
}

/**
 * `"5:00 PM – 6:30 PM"` → `{ startTime: "17:00", endTime: "18:30" }`.
 *
 * A bare `5:00 - 6:30` is read as an afternoon class, because that is what an
 * after-school timetable almost always means. Anything unparseable returns null
 * so the caller can leave the slot blank instead of inventing a time.
 */
export function parseScheduleTime(
  text: string | null | undefined,
): { startTime: string; endTime: string } | null {
  if (!text) return null;
  const pattern =
    /(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?\s*(?:-|–|—|to|until|till|=>)\s*(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?/i;
  const match = pattern.exec(text.toLowerCase());
  if (!match) return null;

  const to24 = (
    hour: number,
    minute: number,
    meridiem: string | undefined,
    fallback: string | undefined,
  ) => {
    const suffix = meridiem ?? fallback;
    let hours = hour;
    if (suffix === "pm" && hours < 12) hours += 12;
    if (suffix === "am" && hours === 12) hours = 0;
    // No suffix anywhere: assume an afternoon slot.
    if (!suffix && hours >= 1 && hours <= 7) hours += 12;
    if (hours > 23) return null;
    return hours * 60 + minute;
  };

  const start = to24(
    Number(match[1]),
    Number(match[2] ?? 0),
    match[3],
    match[6],
  );
  const end = to24(
    Number(match[4]),
    Number(match[5] ?? 0),
    match[6],
    match[3],
  );
  if (start === null || end === null || end <= start) return null;
  return { startTime: minutesToTime(start), endTime: minutesToTime(end) };
}

/**
 * Reads a group's legacy `scheduleDays` / `scheduleTime` text into concrete
 * weekly slots, ready to be turned into calendar rows.
 */
export function parseGroupSchedule(group: {
  scheduleDays?: string | null;
  scheduleTime?: string | null;
}): { dayOfWeek: number; startTime: string; endTime: string }[] {
  const range = parseScheduleTime(group.scheduleTime);
  if (!range) return [];
  return parseScheduleDays(group.scheduleDays).map(dayOfWeek => ({
    dayOfWeek,
    startTime: range.startTime,
    endTime: range.endTime,
  }));
}