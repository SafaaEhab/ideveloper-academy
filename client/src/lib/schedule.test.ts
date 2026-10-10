import { describe, expect, it } from "vitest";
import {
  addDays,
  buildColorMap,
  buildOccurrences,
  colorFor,
  eachDate,
  findConflicts,
  formatDuration,
  formatTime,
  formatTimeRange,
  fromDateKey,
  isSameDay,
  layoutOverlaps,
  minutesToTime,
  monthGrid,
  occurrenceKey,
  parseGroupSchedule,
  parseScheduleDays,
  parseScheduleTime,
  shiftTimeRange,
  startOfWeek,
  timeToMinutes,
  toDateKey,
  weekDays,
  type Occurrence,
  type ScheduleException,
  type ScheduleSession,
} from "@/lib/schedule";

function session(over: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: 1,
    groupId: 10,
    dayOfWeek: 6,
    startTime: "17:00",
    endTime: "18:30",
    location: null,
    notes: null,
    groupName: "Python Explorers",
    groupLevel: null,
    ...over,
  };
}

function exception(over: Partial<ScheduleException> = {}): ScheduleException {
  return {
    id: 100,
    sessionId: 1,
    dateKey: "2026-10-10",
    kind: "moved",
    moveToDate: null,
    startTime: null,
    endTime: null,
    ...over,
  };
}

function occurrence(over: Partial<Occurrence> = {}): Occurrence {
  return {
    key: "1@2026-10-10",
    sessionId: 1,
    exceptionId: null,
    groupId: 10,
    groupName: "Python Explorers",
    groupLevel: null,
    dateKey: "2026-10-10",
    dayOfWeek: 6,
    startTime: "17:00",
    endTime: "18:30",
    location: null,
    notes: null,
    moved: false,
    ...over,
  };
}

describe("time helpers", () => {
  it("parses 24-hour times and rejects nonsense", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("17:30")).toBe(1050);
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(timeToMinutes("9:05")).toBe(545);
    expect(timeToMinutes("24:00")).toBeNull();
    expect(timeToMinutes("12:60")).toBeNull();
    expect(timeToMinutes("5 PM")).toBeNull();
    expect(timeToMinutes(null)).toBeNull();
    expect(timeToMinutes(undefined)).toBeNull();
    expect(timeToMinutes("")).toBeNull();
  });

  it("round-trips minutes back to a padded time", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(1050)).toBe("17:30");
    expect(minutesToTime(1439)).toBe("23:59");
    expect(minutesToTime(1440)).toBe("24:00");
  });

  it("clamps out-of-range minutes instead of wrapping into another day", () => {
    expect(minutesToTime(-30)).toBe("00:00");
    expect(minutesToTime(9999)).toBe("24:00");
  });

  it("formats times for a mixed English/Arabic audience", () => {
    expect(formatTime("17:00")).toBe("5:00 PM");
    expect(formatTime("00:30")).toBe("12:30 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    // Unparseable input is echoed rather than replaced with a wrong time.
    expect(formatTime("nonsense")).toBe("nonsense");
  });

  it("formats ranges and durations", () => {
    expect(formatTimeRange("17:00", "18:30")).toContain("5:00 PM");
    expect(formatTimeRange("17:00", "18:30")).toContain("6:30 PM");
    expect(formatDuration("17:00", "18:30")).toBe("1h 30m");
    expect(formatDuration("17:00", "18:00")).toBe("1h");
    // Same start and end has no meaningful duration.
    expect(formatDuration("17:00", "17:00")).toBe("");
  });
});

describe("shiftTimeRange", () => {
  it("moves a whole range by whole minutes", () => {
    expect(shiftTimeRange("17:00", "18:30", 60)).toEqual({
      startTime: "18:00",
      endTime: "19:30",
    });
    expect(shiftTimeRange("17:00", "18:30", -60)).toEqual({
      startTime: "16:00",
      endTime: "17:30",
    });
  });

  it("passes the delta through for the caller to snap", () => {
    // Snapping to the drag grid lives in the calendar component, which knows
    // SNAP_MINUTES; here the delta is applied exactly.
    expect(shiftTimeRange("17:00", "18:30", 15).startTime).toBe("17:15");
    expect(shiftTimeRange("17:00", "18:30", -30).startTime).toBe("16:30");
  });

  it("keeps the original length", () => {
    const moved = shiftTimeRange("17:00", "18:30", 45);
    expect(timeToMinutes(moved.endTime)! - timeToMinutes(moved.startTime)!).toBe(90);
  });

  it("survives being dragged past midnight", () => {
    const moved = shiftTimeRange("23:00", "23:30", 120);
    expect(moved.startTime).toBe("24:00");
    expect(moved.endTime).toBe("24:00");
  });
});

describe("date helpers", () => {
  it("formats and parses date keys at local midnight", () => {
    expect(toDateKey(new Date(2026, 9, 4))).toBe("2026-10-04");
    expect(toDateKey(new Date(2026, 0, 1))).toBe("2026-01-01");
    const parsed = fromDateKey("2026-10-04");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(4);
    expect(parsed.getHours()).toBe(0);
  });

  it("round-trips a date key", () => {
    for (const key of ["2026-01-01", "2026-02-28", "2026-12-31", "2024-02-29"]) {
      expect(toDateKey(fromDateKey(key))).toBe(key);
    }
  });

  it("adds days across month and year boundaries", () => {
    expect(toDateKey(addDays(new Date(2026, 9, 31), 1))).toBe("2026-11-01");
    expect(toDateKey(addDays(new Date(2026, 0, 1), -1))).toBe("2025-12-31");
  });

  it("compares days by calendar date, not by clock time", () => {
    expect(isSameDay(new Date(2026, 9, 4, 1), new Date(2026, 9, 4, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 4), new Date(2026, 9, 5))).toBe(false);
  });

  it("lists an inclusive date range", () => {
    const dates = eachDate(new Date(2026, 9, 1), new Date(2026, 9, 3));
    expect(dates.map(toDateKey)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  it("returns a single day when from and to match", () => {
    expect(eachDate(new Date(2026, 9, 1), new Date(2026, 9, 1))).toHaveLength(1);
  });

  it("starts weeks on the requested day", () => {
    // 2026-10-04 is a Sunday.
    const sunday = startOfWeek(new Date(2026, 9, 4), 0);
    expect(toDateKey(sunday)).toBe("2026-10-04");
// Saturday-start: Oct 4 is itself a Sunday, so its week began Oct 3.
    const saturday = startOfWeek(new Date(2026, 9, 4), 6);
    expect(toDateKey(saturday)).toBe("2026-10-03");
  });

  it("builds week and month grids", () => {
    // Oct 4 2026 is a Sunday.
    const week = weekDays(new Date(2026, 9, 4), 0);
    expect(week).toHaveLength(7);
    expect(toDateKey(week[0])).toBe("2026-10-04");
    expect(toDateKey(week[6])).toBe("2026-10-10");

    // Monday-start shifts the same anchor a day earlier.
    const mondayWeek = weekDays(new Date(2026, 9, 4), 1);
    expect(toDateKey(mondayWeek[0])).toBe("2026-09-28");
    expect(toDateKey(mondayWeek[6])).toBe("2026-10-04");

    // The month grid is a fixed 6x7 board, padded to whole weeks.
    const month = monthGrid(new Date(2026, 9, 4), 0);
    expect(month).toHaveLength(42);
    expect(toDateKey(month[0])).toBe("2026-09-27");
    expect(month.filter(day => day.getMonth() === 9)).toHaveLength(31);
  });
});

describe("buildOccurrences", () => {
  // Both ends are Saturdays, so a weekly Saturday series lands on both.
  const oct10 = new Date(2026, 9, 10);
  const oct17 = new Date(2026, 9, 17);

  it("expands a weekly series across the window", () => {
    const rows = buildOccurrences([session()], [], oct10, oct17);
    expect(rows.map(row => row.dateKey)).toEqual([
      "2026-10-10",
      "2026-10-17",
    ]);
    expect(rows[0].moved).toBe(false);
    expect(rows[0].exceptionId).toBeNull();
    expect(rows[0].key).toBe("1@2026-10-10");
  });

  it("returns nothing when there are no sessions", () => {
    expect(buildOccurrences([], [exception()], oct10, oct17)).toEqual([]);
  });

  it("stays inside the requested window", () => {
    // A window that starts after the 10th and ends before the 17th sees neither.
    const rows = buildOccurrences([session()], [], new Date(2026, 9, 11), new Date(2026, 9, 16));
    expect(rows.map(row => row.dateKey)).toEqual([]);
    // Widening it to include the 17th brings that week back.
    const wider = buildOccurrences([session()], [], new Date(2026, 9, 11), oct17);
    expect(wider.map(row => row.dateKey)).toEqual(["2026-10-17"]);
  });

  it("drops a cancelled week but keeps the rest of the series", () => {
    const rows = buildOccurrences(
      [session()],
      [exception({ dateKey: "2026-10-10", kind: "cancelled" })],
      oct10,
      oct17,
    );
    expect(rows.map(row => row.dateKey)).toEqual(["2026-10-17"]);
  });

  it("applies a same-day retime and flags it as moved", () => {
    const rows = buildOccurrences(
      [session()],
      [exception({ dateKey: "2026-10-10", kind: "moved", startTime: "19:00", endTime: "20:00" })],
      oct10,
      oct17,
    );
    const first = rows.find(row => row.dateKey === "2026-10-10")!;
    expect(first.startTime).toBe("19:00");
    expect(first.endTime).toBe("20:00");
    expect(first.moved).toBe(true);
    expect(first.exceptionId).toBe(100);
    // The following week is untouched.
    expect(rows.find(row => row.dateKey === "2026-10-17")!.startTime).toBe("17:00");
  });

  it("moves a session to a different day without duplicating it", () => {
    const rows = buildOccurrences(
      [session()],
      [exception({ dateKey: "2026-10-10", kind: "moved", moveToDate: "2026-10-12" })],
      oct10,
      oct17,
    );
    // Saturday the 10th is vacated; the session appears on Monday the 12th.
    expect(rows.map(row => row.dateKey)).toEqual(["2026-10-12", "2026-10-17"]);
    expect(rows[0].dayOfWeek).toBe(1);
    expect(rows[0].moved).toBe(true);
  });

  it("does not resurrect a class cancelled on its destination date", () => {
    const rows = buildOccurrences(
      [session()],
      [
        exception({ id: 100, dateKey: "2026-10-10", kind: "moved", moveToDate: "2026-10-12" }),
        exception({ id: 101, dateKey: "2026-10-12", kind: "cancelled" }),
      ],
      oct10,
      oct17,
    );
    expect(rows.map(row => row.dateKey)).toEqual(["2026-10-17"]);
  });

  it("ignores a move that lands outside the window", () => {
    const rows = buildOccurrences(
      [session()],
      [exception({ dateKey: "2026-10-10", kind: "moved", moveToDate: "2026-11-01" })],
      oct10,
      oct17,
    );
    expect(rows.map(row => row.dateKey)).toEqual(["2026-10-17"]);
  });

  it("ignores an exception whose session no longer exists", () => {
    const rows = buildOccurrences(
      [session()],
      [exception({ sessionId: 999, dateKey: "2026-10-10", kind: "cancelled" })],
      oct10,
      oct17,
    );
    expect(rows.map(row => row.dateKey)).toEqual(["2026-10-10", "2026-10-17"]);
  });

  it("sorts by date then start time then group", () => {
    const rows = buildOccurrences(
      [
        session({ id: 1, dayOfWeek: 6, startTime: "18:00", endTime: "19:00", groupName: "B" }),
        session({ id: 2, dayOfWeek: 6, startTime: "17:00", endTime: "18:00", groupName: "A" }),
      ],
      [],
      oct10,
      oct10,
    );
    expect(rows.map(row => row.startTime)).toEqual(["17:00", "18:00"]);
  });
});

describe("findConflicts", () => {
  it("flags overlapping sessions on the same day", () => {
    const conflicts = findConflicts([
      occurrence({ key: "a", startTime: "17:00", endTime: "18:30" }),
      occurrence({ key: "b", startTime: "18:00", endTime: "19:00" }),
    ]);
    expect(conflicts.has("a")).toBe(true);
    expect(conflicts.has("b")).toBe(true);
  });

  it("treats touching endpoints as fine", () => {
    const conflicts = findConflicts([
      occurrence({ key: "a", startTime: "16:00", endTime: "17:00" }),
      occurrence({ key: "b", startTime: "17:00", endTime: "18:00" }),
    ]);
    expect(conflicts.size).toBe(0);
  });

  it("never compares across different days", () => {
    const conflicts = findConflicts([
      occurrence({ key: "a", dateKey: "2026-10-10" }),
      occurrence({ key: "b", dateKey: "2026-10-11" }),
    ]);
    expect(conflicts.size).toBe(0);
  });

  it("has no opinion about a lone session", () => {
    expect(findConflicts([occurrence()]).size).toBe(0);
  });
});

describe("layoutOverlaps", () => {
  it("gives a single session the full width", () => {
    const laid = layoutOverlaps([occurrence()]);
    expect(laid).toHaveLength(1);
    expect(laid[0].column).toBe(0);
    expect(laid[0].columns).toBe(1);
  });

  it("splits two overlapping sessions into side-by-side columns", () => {
    const laid = layoutOverlaps([
      occurrence({ key: "a", startTime: "17:00", endTime: "18:30" }),
      occurrence({ key: "b", startTime: "18:00", endTime: "19:00" }),
    ]);
    expect(laid.every(item => item.columns === 2)).toBe(true);
    expect(laid.map(item => item.column).sort()).toEqual([0, 1]);
  });

  it("does not narrow sessions that never overlap", () => {
    const laid = layoutOverlaps([
      occurrence({ key: "a", startTime: "16:00", endTime: "17:00" }),
      occurrence({ key: "b", startTime: "17:00", endTime: "18:00" }),
    ]);
    expect(laid.every(item => item.columns === 1)).toBe(true);
  });
});

describe("group colours", () => {
  it("gives every group a stable colour", () => {
    const colors = buildColorMap([1, 2, 3]);
    expect(colors.get(1)).toBe(colors.get(1));
    expect(colors.get(1)!.name).not.toBe(colors.get(2)!.name);
  });

  it("reuses the palette once the groups run out of colours", () => {
    const colors = buildColorMap([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(colors.get(1)!.name).toBe(colors.get(9)!.name);
  });

  it("falls back to the first colour for an unknown group", () => {
    const colors = buildColorMap([1]);
    expect(colorFor(999, colors).name).toBe(buildColorMap([1]).get(1)!.name);
  });
});

describe("parseScheduleDays", () => {
  it("reads English day names", () => {
    expect(parseScheduleDays("Saturday, Tuesday")).toEqual([2, 6]);
    expect(parseScheduleDays("sunday")).toEqual([0]);
  });

  it("reads Arabic day names and separators", () => {
expect(parseScheduleDays("السبت، الاحد")).toEqual([0, 6]);
    expect(parseScheduleDays("الثلاثاء؛الخميس")).toEqual([2, 4]);
  });

  it("sorts and dedupes", () => {
    expect(parseScheduleDays("Sat, Saturday, sat")).toEqual([6]);
    expect(parseScheduleDays("Friday, Monday, Sunday")).toEqual([0, 1, 5]);
  });

  it("skips words it does not recognise", () => {
    expect(parseScheduleDays("Saturday and whenever")).toEqual([6]);
  });

  it("returns an empty list for empty input", () => {
    expect(parseScheduleDays(null)).toEqual([]);
    expect(parseScheduleDays(undefined)).toEqual([]);
    expect(parseScheduleDays("")).toEqual([]);
  });
});

describe("parseScheduleTime", () => {
  it("reads an explicit 12-hour range", () => {
    expect(parseScheduleTime("5:00 PM – 6:30 PM")).toEqual({
      startTime: "17:00",
      endTime: "18:30",
    });
  });

  it("reads a 24-hour range", () => {
    expect(parseScheduleTime("17:00 - 18:30")).toEqual({
      startTime: "17:00",
      endTime: "18:30",
    });
  });

  it("treats a bare morning hour as an afternoon class", () => {
    expect(parseScheduleTime("5 - 6:30")).toEqual({
      startTime: "17:00",
      endTime: "18:30",
    });
  });

  it("respects midnight and noon", () => {
    expect(parseScheduleTime("12:00 am - 1:00 am")).toEqual({
      startTime: "00:00",
      endTime: "01:00",
    });
  });

  it("returns null rather than inventing a time", () => {
    expect(parseScheduleTime(null)).toBeNull();
    expect(parseScheduleTime("")).toBeNull();
    expect(parseScheduleTime("sometime soon")).toBeNull();
    // The end has to be after the start.
    expect(parseScheduleTime("6:00 PM - 5:00 PM")).toBeNull();
    expect(parseScheduleTime("5:00 PM - 5:00 PM")).toBeNull();
  });
});

describe("parseGroupSchedule", () => {
  it("expands days and time into weekly slots", () => {
    expect(parseGroupSchedule({ scheduleDays: "Saturday, Tuesday", scheduleTime: "5:00 PM - 6:30 PM" })).toEqual([
      { dayOfWeek: 2, startTime: "17:00", endTime: "18:30" },
      { dayOfWeek: 6, startTime: "17:00", endTime: "18:30" },
    ]);
  });

  it("needs both a day and a time to make a slot", () => {
    expect(parseGroupSchedule({ scheduleDays: "Saturday", scheduleTime: null })).toEqual([]);
    expect(parseGroupSchedule({ scheduleDays: null, scheduleTime: "5 PM - 6 PM" })).toEqual([]);
  });
});

describe("occurrenceKey", () => {
  it("builds a unique key per session and date", () => {
    expect(occurrenceKey(1, "2026-10-10")).toBe("1@2026-10-10");
    expect(occurrenceKey(1, "2026-10-10")).not.toBe(occurrenceKey(2, "2026-10-10"));
    expect(occurrenceKey(1, "2026-10-10")).not.toBe(occurrenceKey(1, "2026-10-17"));
  });
});