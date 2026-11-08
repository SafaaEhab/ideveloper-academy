import { describe, expect, it } from "vitest";
import {
  buildReportRows,
  buildShareMessage,
  paginateReportRows,
  reportFileName,
  summarizeReportRows,
  type ReportEvaluation,
  type ReportStudent,
  type ReportRow,
} from "./evaluationReport";

const students: ReportStudent[] = [
  { id: 1, name: "لينا أحمد", courses: ["Python"] },
  { id: 2, name: "يوسف علي", courses: ["Python", "Web"] },
  { id: 3, name: "مريم حسن", courses: ["Python"] },
];

function evaluation(overrides: Partial<ReportEvaluation> & { studentId: number }): ReportEvaluation {
  return {
    attendance: null,
    homework: null,
    focus: null,
    participation: null,
    notes: null,
    ...overrides,
  };
}

function row(overrides: Partial<ReportRow> & { studentId: number }): ReportRow {
  return {
    name: `Student ${overrides.studentId}`,
    evaluated: true,
    attendance: null,
    homework: null,
    focus: null,
    participation: null,
    notes: null,
    ...overrides,
  };
}

describe("buildReportRows", () => {
  it("keeps every student, in order, including those without a saved row", () => {
    const rows = buildReportRows(students, [evaluation({ studentId: 2, attendance: "present" })]);
    expect(rows.map(item => item.studentId)).toEqual([1, 2, 3]);
    expect(rows.map(item => item.name)).toEqual([
      "لينا أحمد",
      "يوسف علي",
      "مريم حسن",
    ]);
    expect(rows.map(item => item.evaluated)).toEqual([false, true, false]);
  });

  it("distinguishes a missing evaluation from a saved absent / not submitted row", () => {
    const rows = buildReportRows(students, [
      evaluation({
        studentId: 1,
        attendance: "absent",
        homework: "not_completed",
      }),
      evaluation({ studentId: 2, attendance: "present", homework: "completed" }),
    ]);

    const [absent, present, missing] = rows;

    expect(absent.evaluated).toBe(true);
    expect(absent.attendance).toBe("absent");
    expect(absent.homework).toBe("not_completed");

    expect(present.evaluated).toBe(true);
    expect(present.attendance).toBe("present");
    expect(present.homework).toBe("completed");

    expect(missing.evaluated).toBe(false);
    expect(missing.attendance).toBeNull();
    expect(missing.homework).toBeNull();
    expect(missing.focus).toBeNull();
    expect(missing.participation).toBeNull();
    expect(missing.notes).toBeNull();
  });

  it("keeps saved rows whose fields are empty as evaluated but partial", () => {
    const rows = buildReportRows(students.slice(0, 1), [
      evaluation({ studentId: 1, notes: "   " }),
    ]);
    expect(rows[0].evaluated).toBe(true);
    expect(rows[0].notes).toBeNull();
    expect(summarizeReportRows(rows)).toMatchObject({
      studentCount: 1,
      evaluatedCount: 1,
      missingCount: 0,
      partialCount: 1,
    });
  });

  it("uses the last saved evaluation when a student appears twice", () => {
    const rows = buildReportRows(students.slice(0, 1), [
      evaluation({ studentId: 1, attendance: "absent" }),
      evaluation({ studentId: 1, attendance: "present", focus: 4 }),
    ]);
    expect(rows[0].attendance).toBe("present");
    expect(rows[0].focus).toBe(4);
  });

  it("never fabricates rows for evaluations whose student left the group", () => {
    const rows = buildReportRows(students, [evaluation({ studentId: 999, attendance: "present" })]);
    expect(rows).toHaveLength(3);
    expect(rows.every(item => !item.evaluated)).toBe(true);
  });

  it("trims notes and collapses surrounding whitespace only at the edges", () => {
    const rows = buildReportRows(students.slice(0, 1), [
      evaluation({ studentId: 1, notes: "  يحتاج مراجعة الواجب  " }),
    ]);
    expect(rows[0].notes).toBe("يحتاج مراجعة الواجب");
  });
});

describe("summarizeReportRows", () => {
  it("counts evaluated, missing, and partially filled rows separately", () => {
    const rows = [
      row({ studentId: 1, attendance: "present", homework: "completed", focus: 5, participation: 5 }),
      row({ studentId: 2, attendance: "absent" }),
      row({ studentId: 3, evaluated: false, attendance: null, homework: null }),
      row({ studentId: 4, evaluated: false }),
    ];
    expect(summarizeReportRows(rows)).toEqual({
      studentCount: 4,
      evaluatedCount: 2,
      missingCount: 2,
      partialCount: 1,
    });
  });

  it("handles an empty group", () => {
    expect(summarizeReportRows([])).toEqual({
      studentCount: 0,
      evaluatedCount: 0,
      missingCount: 0,
      partialCount: 0,
    });
  });
});

describe("paginateReportRows", () => {
  const makeRows = (count: number) =>
    Array.from({ length: count }, (_, index) => row({ studentId: index + 1 }));

  it("puts exactly 12 students on one page", () => {
    const pages = paginateReportRows(makeRows(12));
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(12);
  });

  it("moves student 13 to a second page", () => {
    const pages = paginateReportRows(makeRows(13));
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(12);
    expect(pages[1].map(item => item.studentId)).toEqual([13]);
  });

  it("splits 25 students into 12 + 12 + 1", () => {
    const pages = paginateReportRows(makeRows(25));
    expect(pages.map(page => page.length)).toEqual([12, 12, 1]);
  });

  it("returns one empty page for a group with no students", () => {
    expect(paginateReportRows([])).toEqual([[]]);
  });

  it("honours a custom page size", () => {
    expect(paginateReportRows(makeRows(5), 2).map(page => page.length)).toEqual([
      2, 2, 1,
    ]);
  });

  it("rejects a nonsensical page size instead of looping forever", () => {
    expect(() => paginateReportRows(makeRows(3), 0)).toThrow();
  });
});

describe("reportFileName", () => {
  it("includes a safe group name, date, and page position", () => {
    expect(
      reportFileName({ groupName: "Python / Explorers: A", dateKey: "2026-10-24" }, 2, 3),
    ).toBe("iDeveloper-Python-Explorers-A-2026-10-24-p2-of-3.png");
  });

  it("keeps Arabic names and falls back for an empty name", () => {
    expect(reportFileName({ groupName: "مجموعة الروبوت", dateKey: "2026-10-24" }, 1, 1)).toContain(
      "مجموعة-الروبوت",
    );
    expect(reportFileName({ groupName: "   ", dateKey: "2026-10-24" }, 1, 1)).toBe(
      "iDeveloper-group-2026-10-24-p1-of-1.png",
    );
  });
});

describe("buildShareMessage", () => {
  const base = {
    groupName: "Python Explorers",
    dateLabel: "السبت، 24 أكتوبر",
    timeLabel: "5:00 م – 6:30 م",
    instructorName: "مس سلمى",
    studentCount: 14,
    evaluatedCount: 11,
    missingCount: 3,
    partialCount: 2,
    pageCount: 2,
  };

  it("states the saved / missing counts and the page count", () => {
    const message = buildShareMessage(base);
    expect(message).toContain("مجموعة Python Explorers");
    expect(message).toContain("عدد الطلاب: 14");
    expect(message).toContain("تم تقييمهم: 11");
    expect(message).toContain("بدون تقييم محفوظ: 3");
    expect(message).toContain("صور التقرير: 2 صفحات");
    expect(message).toContain("بدون تقييم");
    expect(message).toContain("iDeveloper Academy");
  });

  it("does not imply that messages were delivered", () => {
    const message = buildShareMessage(base);
    expect(message).not.toMatch(/تم الإرسال|تم إرسال|وصلت/);
  });

  it("does not call missing students absent", () => {
    const message = buildShareMessage(base);
    expect(message).not.toMatch(/غائب/);
  });

  it("says every student is evaluated only when nothing is missing", () => {
    const message = buildShareMessage({
      ...base,
      missingCount: 0,
      partialCount: 0,
      evaluatedCount: 14,
    });
    expect(message).toContain("كل الطلاب لديهم تقييم محفوظ");
    expect(message).not.toContain("بدون تقييم محفوظ: 1");
  });

  it("mentions partial rows without turning them into missing rows", () => {
    const message = buildShareMessage(base);
    expect(message).toContain("تقييمات ناقصة: 2");
    expect(message).toContain("لم يُسجَّل");
  });

  it("falls back to an explicit unassigned label", () => {
    const message = buildShareMessage({ ...base, instructorName: "  " });
    expect(message).toContain("المدرّب: غير مسند");
  });

  it("includes the location only when provided", () => {
    expect(buildShareMessage(base)).not.toContain("·  ·");
    expect(buildShareMessage({ ...base, location: "المعمل" })).toContain(
      "· المعمل",
    );
  });

  it("uses singular wording for a single page", () => {
    expect(buildShareMessage({ ...base, pageCount: 1 })).toContain("صور التقرير: 1 صفحة");
  });
});
