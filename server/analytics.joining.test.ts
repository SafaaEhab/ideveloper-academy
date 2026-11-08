import { describe, expect, it } from "vitest";
import { effectiveAttendanceStart } from "./analytics";

describe("attendance effective start (H-07)", () => {
  it("uses the filter start when the student joined before it", () => {
    expect(effectiveAttendanceStart("2026-01-01", "2025-03-10")).toBe("2026-01-01");
  });

  it("uses the join date when the student joined after the filter start", () => {
    expect(effectiveAttendanceStart("2026-01-01", "2026-09-01")).toBe("2026-09-01");
  });

  it("falls back to the filter start when the join date is missing or invalid", () => {
    expect(effectiveAttendanceStart("2026-01-01", null)).toBe("2026-01-01");
    expect(effectiveAttendanceStart("2026-01-01", "")).toBe("2026-01-01");
  });

  it("treats the join date itself as eligible", () => {
    expect(effectiveAttendanceStart("2026-01-01", "2026-01-01")).toBe("2026-01-01");
  });

  it("excludes sessions dated before the effective start", () => {
    const start = effectiveAttendanceStart("2026-04-01", "2026-05-20");
    const sessions = [
      "2026-04-01",
      "2026-04-08",
      "2026-05-13",
      "2026-05-20",
      "2026-05-27",
    ];
    expect(sessions.filter(dateKey => dateKey >= start)).toEqual([
      "2026-05-20",
      "2026-05-27",
    ]);
  });
});
