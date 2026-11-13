import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  addMonthsToDateKey,
  currentMonthRange,
  dateKeyInTimeZone,
  differenceInDateKeys,
  isValidDateKey,
  makeDateKey,
  zonedDateTimeToUtc,
} from "./time";

describe("academy wall-clock helpers", () => {
  it("validates real date keys", () => {
    expect(isValidDateKey("2026-02-28")).toBe(true);
    expect(isValidDateKey("2026-02-29")).toBe(false);
    expect(isValidDateKey("2024-02-29")).toBe(true);
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("not-a-date")).toBe(false);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDaysToDateKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("clamps month addition to the target month's last day", () => {
    expect(addMonthsToDateKey("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsToDateKey("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsToDateKey("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("computes calendar-day differences", () => {
    expect(differenceInDateKeys("2026-01-01", "2026-01-10")).toBe(9);
    expect(differenceInDateKeys("2026-01-10", "2026-01-01")).toBe(-9);
    expect(differenceInDateKeys("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("uses the Cairo date even when UTC is still the previous day", () => {
    expect(
      dateKeyInTimeZone(new Date("2026-01-14T22:30:00.000Z"), "Africa/Cairo"),
    ).toBe("2026-01-15");
    expect(
      dateKeyInTimeZone(new Date("2026-01-14T20:30:00.000Z"), "Africa/Cairo"),
    ).toBe("2026-01-14");
  });

  it("converts Cairo wall-clock times to UTC in winter and summer", () => {
    expect(
      zonedDateTimeToUtc("2026-01-15", "09:00", "Africa/Cairo").toISOString(),
    ).toBe("2026-01-15T07:00:00.000Z");
    expect(
      zonedDateTimeToUtc("2026-07-15", "09:00", "Africa/Cairo").toISOString(),
    ).toBe("2026-07-15T06:00:00.000Z");
  });

  it("builds the current Cairo month range", () => {
    const range = currentMonthRange(new Date("2026-02-10T12:00:00.000Z"));
    expect(range).toEqual({
      fromKey: "2026-02-01",
      toKey: "2026-02-28",
      monthKey: "2026-02",
    });
  });

  it("creates canonical date keys", () => {
    expect(makeDateKey(2026, 2, 3)).toBe("2026-02-03");
  });
});
