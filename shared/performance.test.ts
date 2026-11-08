import { describe, expect, it } from "vitest";
import {
  buildPerformanceInsights,
  buildPerformanceTimeline,
  buildPerformanceTrend,
  buildSessionTimeline,
  isSessionDue,
  mergeAssignmentTotals,
  summarizePerformance,
  type PerformanceEvaluation,
  type PerformanceSession,
} from "./performance";

const empty = {
  attendance: null,
  homework: null,
  focus: null,
  participation: null,
  notes: null,
} as const;

function row(
  dateKey: string,
  overrides: Partial<PerformanceEvaluation> = {},
): PerformanceEvaluation {
  return { dateKey, ...empty, ...overrides };
}

describe("isSessionDue", () => {
  const now = new Date(2026, 9, 28, 17, 30); // 2026-10-28 17:30 local time

  it("treats past dates as due and future dates as not due", () => {
    expect(isSessionDue("2026-10-27", "23:59", now)).toBe(true);
    expect(isSessionDue("2026-10-29", "08:00", now)).toBe(false);
  });

  it("waits for today's session to end before counting it", () => {
    expect(isSessionDue("2026-10-28", "18:00", now)).toBe(false);
    expect(isSessionDue("2026-10-28", "17:30", now)).toBe(true);
    expect(isSessionDue("2026-10-28", "16:00", now)).toBe(true);
  });

  it("does not guess when the end time is missing", () => {
    expect(isSessionDue("2026-10-28", null, now)).toBe(false);
    expect(isSessionDue("2026-10-28", "not-a-time", now)).toBe(false);
  });
});

describe("summarizePerformance", () => {
  it("calculates rates and means only over recorded values", () => {
    const summary = summarizePerformance([
      row("2026-01-01", {
        attendance: "present",
        homework: "completed",
        focus: 5,
        participation: 4,
        notes: "بدأ بثقة",
      }),
      row("2026-01-02", {
        attendance: "absent",
        homework: "not_completed",
        focus: 3,
        participation: 3,
      }),
      row("2026-01-03", { notes: "   " }),
    ]);

    expect(summary).toMatchObject({
      evaluations: 3,
      documented: 2,
      attendanceRecorded: 2,
      presentCount: 1,
      absentCount: 1,
      attendanceRate: 50,
      homeworkRecorded: 2,
      homeworkCompleted: 1,
      homeworkNotCompleted: 1,
      homeworkRate: 50,
      focusRecorded: 2,
      avgFocus: 4,
      participationRecorded: 2,
      avgParticipation: 3.5,
      notesCount: 1,
      firstDateKey: "2026-01-01",
      lastDateKey: "2026-01-03",
    });
  });

  it("keeps every average null when nothing was recorded", () => {
    const summary = summarizePerformance([
      row("2026-02-01"),
      row("2026-02-08"),
    ]);

    expect(summary.evaluations).toBe(2);
    expect(summary.documented).toBe(0);
    expect(summary.attendanceRate).toBeNull();
    expect(summary.homeworkRate).toBeNull();
    expect(summary.avgFocus).toBeNull();
    expect(summary.avgParticipation).toBeNull();
    expect(summary.attendanceRecorded).toBe(0);
    expect(summary.firstDateKey).toBe("2026-02-01");
  });

  it("reports a real 0% when the field was recorded and failed", () => {
    const summary = summarizePerformance([
      row("2026-03-01", {
        attendance: "absent",
        homework: "not_completed",
      }),
    ]);

    expect(summary.attendanceRate).toBe(0);
    expect(summary.homeworkRate).toBe(0);
    expect(summary.attendanceRecorded).toBe(1);
    expect(summary.homeworkRecorded).toBe(1);
  });

  it("treats an empty or whitespace note as not documented", () => {
    const summary = summarizePerformance([
      row("2026-04-01", { notes: "" }),
      row("2026-04-02", { notes: "   " }),
      row("2026-04-03", { notes: "ملاحظة" }),
    ]);

    expect(summary.documented).toBe(1);
    expect(summary.notesCount).toBe(1);
  });
});

describe("buildPerformanceTimeline", () => {
  it("buckets by calendar month without inventing empty months", () => {
    const timeline = buildPerformanceTimeline([
      row("2026-01-04", { attendance: "present" }),
      row("2026-01-11", { attendance: "absent" }),
      row("2026-03-02", { focus: 4, notes: "متحسن" }),
    ]);

    expect(timeline.map(point => point.month)).toEqual(["2026-01", "2026-03"]);
    expect(timeline[0]).toMatchObject({
      evaluations: 2,
      attendanceRecorded: 2,
      attendanceRate: 50,
      avgFocus: null,
    });
    expect(timeline[1]).toMatchObject({
      evaluations: 1,
      attendanceRecorded: 0,
      attendanceRate: null,
      focusRecorded: 1,
      avgFocus: 4,
      notesCount: 1,
    });
  });

  it("ignores rows with an unparseable date instead of inventing a bucket", () => {
    const timeline = buildPerformanceTimeline([
      row("not-a-date", { attendance: "present" }),
      row("2026-05-02", { attendance: "present" }),
    ]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.month).toBe("2026-05");
  });
});

describe("buildPerformanceTrend", () => {
  it("marks fewer than four evaluations as insufficient", () => {
    const trend = buildPerformanceTrend([
      row("2026-01-01", { focus: 1 }),
      row("2026-01-08", { focus: 2 }),
      row("2026-01-15", { focus: 5 }),
    ]);

    expect(trend.direction).toBe("insufficient");
    expect(trend.reason).toBe("insufficient_evaluations");
    expect(trend.evaluationCount).toBe(3);
  });

  it("compares the earlier half with the recent half", () => {
    const trend = buildPerformanceTrend([
      row("2026-01-01", {
        attendance: "absent",
        homework: "not_completed",
        focus: 2,
        participation: 2,
      }),
      row("2026-01-08", {
        attendance: "absent",
        homework: "not_completed",
        focus: 2,
        participation: 2,
      }),
      row("2026-02-01", {
        attendance: "present",
        homework: "completed",
        focus: 4,
        participation: 4,
      }),
      row("2026-02-08", {
        attendance: "present",
        homework: "completed",
        focus: 4,
        participation: 4,
      }),
    ]);

    expect(trend.direction).toBe("improving");
    expect(trend.earlierCount).toBe(2);
    expect(trend.recentCount).toBe(2);
    expect(trend.splitDate).toBe("2026-02-01");
    const attendance = trend.metrics.find(metric => metric.metric === "attendance");
    expect(attendance).toMatchObject({
      earlier: 0,
      recent: 100,
      delta: 100,
      samplesEarlier: 2,
      samplesRecent: 2,
      comparable: true,
      direction: "up",
      significant: true,
    });
  });

  it("reports a decline when the recent half drops", () => {
    const trend = buildPerformanceTrend([
      row("2026-01-01", { focus: 5, participation: 5 }),
      row("2026-01-08", { focus: 5, participation: 5 }),
      row("2026-02-01", { focus: 2, participation: 2 }),
      row("2026-02-08", { focus: 2, participation: 2 }),
    ]);

    expect(trend.direction).toBe("declining");
    expect(
      trend.metrics.find(metric => metric.metric === "focus")?.direction,
    ).toBe("down");
  });

  it("reports stable when changes stay below the thresholds", () => {
    const trend = buildPerformanceTrend([
      row("2026-01-01", { attendance: "present", focus: 3 }),
      row("2026-01-08", { attendance: "present", focus: 3 }),
      row("2026-02-01", { attendance: "present", focus: 3 }),
      row("2026-02-08", { attendance: "present", focus: 3 }),
    ]);

    expect(trend.direction).toBe("stable");
    expect(trend.reason).toBeNull();
  });

  it("does not turn missing values into zero or a false trend", () => {
    const trend = buildPerformanceTrend([
      row("2026-01-01", { attendance: "present" }),
      row("2026-01-08", { attendance: "absent" }),
      row("2026-02-01", { attendance: "present" }),
      row("2026-02-08"),
    ]);

    const attendance = trend.metrics.find(
      metric => metric.metric === "attendance",
    );
    // 50% (1/2) earlier → 100% (1/1) recent. A missing value must not be an
    // absent, which would have made the recent half 50% and hidden the move.
    expect(attendance).toMatchObject({
      earlier: 50,
      recent: 100,
      samplesEarlier: 2,
      samplesRecent: 1,
      delta: 50,
      direction: "up",
    });
  });

  it("is insufficient when no metric is recorded in both halves", () => {
    const trend = buildPerformanceTrend([
      row("2026-01-01", { focus: 5 }),
      row("2026-01-08", { focus: 4 }),
      row("2026-02-01"),
      row("2026-02-08"),
    ]);

    expect(trend.direction).toBe("insufficient");
    expect(trend.reason).toBe("no_comparable_metrics");
    expect(trend.evaluationCount).toBe(4);
  });
});

describe("summarizePerformance with due sessions", () => {
  const dueSessions: PerformanceSession[] = [
    {
      sessionId: 1,
      dateKey: "2026-01-01",
      startTime: "17:00",
      endTime: "18:30",
      groupId: 3,
      groupName: "Python A",
    },
    {
      sessionId: 1,
      dateKey: "2026-01-08",
      startTime: "17:00",
      endTime: "18:30",
      groupId: 3,
      groupName: "Python A",
    },
    {
      sessionId: 2,
      dateKey: "2026-01-15",
      startTime: "17:00",
      endTime: "18:30",
      groupId: 3,
      groupName: "Python A",
    },
  ];

  it("counts attendance against held due sessions, excluding cancelled or unevaluated rows", () => {
    const summary = summarizePerformance(
      [
        row("2026-01-01", {
          sessionId: 1,
          attendance: "present",
          homework: "completed",
        }),
        // A duplicate attendance record for the same session/date must not
        // count as a second attended session.
        row("2026-01-01", {
          id: 50,
          sessionId: 1,
          attendance: "present",
        }),
        row("2026-01-15", {
          sessionId: 2,
          attendance: "absent",
          homework: "not_completed",
        }),
        // This row belongs to a cancelled session: it is not in the timetable
        // expansion, so it must not inflate or reduce the due denominator.
        row("2026-01-10", {
          sessionId: 3,
          attendance: "absent",
          homework: "not_completed",
        }),
      ],
      dueSessions,
    );

    expect(summary.attendanceAvailable).toBe(true);
    expect(summary.attendanceEligible).toBe(3);
    expect(summary.attendanceAttended).toBe(1);
  });

  it("deduplicates homework by session and date and never infers it from sessions", () => {
    const summary = summarizePerformance(
      [
        row("2026-01-01", {
          id: 1,
          sessionId: 1,
          homework: "completed",
        }),
        // A re-saved record for the same session/date must not count twice.
        row("2026-01-01", {
          id: 99,
          sessionId: 1,
          homework: "not_completed",
        }),
        row("2026-01-15", {
          id: 2,
          sessionId: 2,
          homework: "not_completed",
        }),
      ],
      dueSessions,
    );

    expect(summary.homeworkAvailable).toBe(true);
    expect(summary.homeworkRequired).toBe(2);
    expect(summary.homeworkSubmitted).toBe(1);
  });

  it("reports no attendance/homework data when the timetable has no due sessions", () => {
    const summary = summarizePerformance(
      [row("2026-01-01", { sessionId: 1, attendance: "present" })],
      [],
    );

    expect(summary.attendanceAvailable).toBe(false);
    expect(summary.attendanceEligible).toBe(0);
    expect(summary.attendanceAttended).toBe(0);
    expect(summary.homeworkAvailable).toBe(false);
    expect(summary.homeworkRequired).toBe(0);
  });
});

describe("buildSessionTimeline", () => {
  it("orders sessions chronologically and keeps missing ratings as gaps", () => {
    const dueSessions: PerformanceSession[] = [
      {
        sessionId: 2,
        dateKey: "2026-02-05",
        startTime: "18:00",
        endTime: "19:30",
        groupId: 3,
        groupName: "Python A",
      },
      {
        sessionId: 1,
        dateKey: "2026-01-01",
        startTime: "17:00",
        endTime: "18:30",
        groupId: 3,
        groupName: "Python A",
      },
      {
        sessionId: 1,
        dateKey: "2026-01-15",
        startTime: "17:00",
        endTime: "18:30",
        groupId: 3,
        groupName: "Python A",
      },
    ];

    const points = buildSessionTimeline(
      [
        row("2026-02-05", {
          sessionId: 2,
          participation: 5,
          focus: 4,
          attendance: "present",
        }),
        // Evaluated but no longer in the timetable: it must stay visible.
        row("2026-01-20", {
          sessionId: 9,
          participation: 3,
          focus: null,
        }),
      ],
      dueSessions,
    );

    expect(points.map(point => point.dateKey)).toEqual([
      "2026-01-01",
      "2026-01-15",
      "2026-01-20",
      "2026-02-05",
    ]);
    expect(points[0]).toMatchObject({ participation: null, focus: null });
    expect(points[1]).toMatchObject({ participation: null, focus: null });
    expect(points[2]).toMatchObject({ participation: 3, focus: null });
    expect(points[3]).toMatchObject({ participation: 5, focus: 4 });
  });

  it("breaks ties on the same date by start time and session id", () => {
    const base = {
      dateKey: "2026-03-01",
      groupId: 3,
      groupName: "Python A",
    };
    const points = buildSessionTimeline([], [
      { ...base, sessionId: 5, startTime: "18:00", endTime: "19:00" },
      { ...base, sessionId: 2, startTime: "10:00", endTime: "11:00" },
      { ...base, sessionId: 1, startTime: "10:00", endTime: "11:00" },
    ]);

    expect(points.map(point => point.sessionId)).toEqual([1, 2, 5]);
  });
});

describe("buildPerformanceInsights", () => {
  it("requires a minimum sample before claiming a strength", () => {
    const tooFew = summarizePerformance([
      row("2026-01-01", { attendance: "present" }),
      row("2026-01-02", { attendance: "present" }),
    ]);
    expect(
      buildPerformanceInsights(tooFew, buildPerformanceTrend([])).map(
        insight => insight.key,
      ),
    ).not.toContain("attendance_strong");

    const enough = summarizePerformance([
      row("2026-01-01", { attendance: "present" }),
      row("2026-01-02", { attendance: "present" }),
      row("2026-01-03", { attendance: "present" }),
    ]);
    expect(
      buildPerformanceInsights(enough, buildPerformanceTrend([])).map(
        insight => insight.key,
      ),
    ).toContain("attendance_strong");
  });

  it("flags attention points and insufficient documentation", () => {
    const summary = summarizePerformance([
      row("2026-01-01", {
        attendance: "absent",
        homework: "not_completed",
        focus: 2,
        participation: 2,
      }),
      row("2026-01-02", {
        attendance: "absent",
        homework: "not_completed",
        focus: 2,
        participation: 2,
      }),
      row("2026-01-03", {
        attendance: "absent",
        homework: "not_completed",
        focus: 2,
        participation: 2,
      }),
    ]);
    const keys = buildPerformanceInsights(
      summary,
      buildPerformanceTrend([]),
    ).map(insight => insight.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        "attendance_attention",
        "homework_attention",
        "focus_attention",
        "participation_attention",
        "insufficient_documentation",
      ]),
    );
  });
});

describe("assignment homework totals", () => {
  it("adds assignments to the same Homework figure as evaluations", () => {
    const summary = summarizePerformance([
      row("2026-10-01", { homework: "completed" }),
      row("2026-10-02", { homework: "not_completed" }),
    ]);
    expect(summary.homeworkRequired).toBe(2);
    expect(summary.homeworkSubmitted).toBe(1);

    mergeAssignmentTotals(summary, { total: 3, submitted: 2, graded: 1 });

    expect(summary.homeworkRequired).toBe(5);
    expect(summary.homeworkSubmitted).toBe(3);
    expect(summary.assignmentTotal).toBe(3);
    expect(summary.assignmentSubmitted).toBe(2);
    expect(summary.assignmentGraded).toBe(1);
    expect(summary.homeworkAvailable).toBe(true);
  });

  it("still reports homework availability when only assignments exist", () => {
    const summary = summarizePerformance([]);
    expect(summary.homeworkAvailable).toBe(false);
    mergeAssignmentTotals(summary, { total: 1, submitted: 0, graded: 0 });
    expect(summary.homeworkAvailable).toBe(true);
    expect(summary.homeworkRequired).toBe(1);
  });
});
