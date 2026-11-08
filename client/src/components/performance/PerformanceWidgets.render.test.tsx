// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AttendanceHomeworkCards,
  InteractionFocusChart,
  StudentPerformanceTable,
} from "@/components/performance/PerformanceWidgets";
import type {
  PerformanceSessionPoint,
  PerformanceStudentRow,
  PerformanceSummary,
} from "@shared/performance";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const summary: PerformanceSummary = {
  evaluations: 4,
  documented: 4,
  attendanceRecorded: 3,
  presentCount: 2,
  absentCount: 1,
  attendanceRate: 66.7,
  homeworkRecorded: 3,
  homeworkCompleted: 2,
  homeworkNotCompleted: 1,
  homeworkRate: 66.7,
  focusRecorded: 2,
  avgFocus: 3.5,
  participationRecorded: 2,
  avgParticipation: 4,
  notesCount: 0,
  firstDateKey: "2026-10-03",
  lastDateKey: "2026-10-24",
  attendanceEligible: 4,
  attendanceAttended: 3,
  attendanceAvailable: true,
  homeworkRequired: 3,
  homeworkSubmitted: 2,
  homeworkAvailable: true,
};

const unavailable: PerformanceSummary = {
  ...summary,
  attendanceEligible: 0,
  attendanceAttended: 0,
  attendanceAvailable: false,
  homeworkRequired: 0,
  homeworkSubmitted: 0,
  homeworkAvailable: false,
};

const session: PerformanceSessionPoint = {
  key: "11@2026-10-24",
  sessionId: 11,
  dateKey: "2026-10-24",
  startTime: "17:00",
  endTime: "18:30",
  groupId: 3,
  groupName: "Python A",
  attendance: "present",
  homework: "completed",
  focus: null,
  participation: null,
};

const studentRow: PerformanceStudentRow = {
  studentId: 7,
  name: "سارة أحمد",
  status: "active",
  groupId: 3,
  groupName: "Python A",
  courses: ["Python"],
  summary,
  trend: {
    direction: "insufficient",
    reason: "insufficient_evaluations",
    evaluationCount: 4,
    earlierCount: 0,
    recentCount: 4,
    splitDate: null,
    metrics: [],
  },
  insights: [],
  lastEvaluationDateKey: "2026-10-24",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AttendanceHomeworkCards", () => {
  it("renders attended and submitted counts against their totals", () => {
    act(() => {
      root.render(<AttendanceHomeworkCards summary={summary} />);
    });

    expect(container.textContent).toContain("حضر 3 من أصل 4 حصة مستحقة");
    expect(container.textContent).toContain("سلّم 2 من أصل 3 واجبًا مطلوبًا");
  });

  it("shows the insufficient-data message instead of inventing numbers", () => {
    act(() => {
      root.render(<AttendanceHomeworkCards summary={unavailable} />);
    });

    expect(container.textContent).toContain("لا توجد بيانات كافية");
    expect(container.textContent).not.toContain("/ 0");
  });
});

describe("InteractionFocusChart", () => {
  it("shows a clear empty state when no interaction or focus rating exists", () => {
    act(() => {
      root.render(<InteractionFocusChart sessions={[session]} />);
    });

    expect(container.textContent).toContain(
      "لا توجد تقييمات تفاعل أو تركيز كافية",
    );
  });
});

describe("StudentPerformanceTable", () => {
  it("shows per-student attendance and homework without other aggregates", () => {
    act(() => {
      root.render(
        <StudentPerformanceTable rows={[studentRow]} onSelect={() => {}} />,
      );
    });

    expect(container.textContent).toContain("سارة أحمد");
    expect(container.textContent).toContain("من 4 حصة");
    expect(container.textContent).toContain("من 3 واجب");
    expect(container.textContent).not.toContain("الاتجاه");
  });
});
