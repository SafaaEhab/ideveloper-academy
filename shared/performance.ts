/**
 * Performance analytics shared between the server and the three dashboards.
 *
 * The rules here are deliberately conservative:
 *  - a missing evaluation field is *unknown*, never zero;
 *  - attendance / homework stay categorical counts, with a rate only over the
 *    rows where they were actually recorded;
 *  - focus / participation average only defined 1–5 ratings;
 *  - a trend needs at least four documented evaluations and at least one
 *    comparable value in each half, otherwise it is explicitly "insufficient".
 *
 * Everything in this file is pure, so the same numbers power the UI and the
 * tests without a database.
 */

export type AttendanceState = "present" | "absent";
export type HomeworkState = "completed" | "not_completed";

export type PerformanceEvaluation = {
  id?: number;
  sessionId?: number | null;
  groupName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  dateKey: string;
  attendance: AttendanceState | null;
  homework: HomeworkState | null;
  focus: number | null;
  participation: number | null;
  notes: string | null;
};

/** A dated session that has already happened and is due for evaluation. */
export type PerformanceSession = {
  sessionId: number;
  dateKey: string;
  startTime: string | null;
  endTime: string | null;
  groupId: number;
  groupName: string;
};

/** One row in the interaction/focus chart, including gaps for missed records. */
export type PerformanceSessionPoint = PerformanceSession & {
  key: string;
  attendance: AttendanceState | null;
  homework: HomeworkState | null;
  focus: number | null;
  participation: number | null;
};

export type PerformanceSummary = {
  /** Every stored evaluation row in scope, including fields left blank. */
  evaluations: number;
  /** Rows with at least one recorded field (or a non-empty note). */
  documented: number;
  attendanceRecorded: number;
  presentCount: number;
  absentCount: number;
  /** present / attendanceRecorded, 0–100. Null when nothing was recorded. */
  attendanceRate: number | null;
  homeworkRecorded: number;
  homeworkCompleted: number;
  homeworkNotCompleted: number;
  /** completed / homeworkRecorded, 0–100. Null when nothing was recorded. */
  homeworkRate: number | null;
  focusRecorded: number;
  /** Mean of defined 1–5 ratings. Null when no rating exists. */
  avgFocus: number | null;
  participationRecorded: number;
  /** Mean of defined 1–5 ratings. Null when no rating exists. */
  avgParticipation: number | null;
  notesCount: number;
  firstDateKey: string | null;
  lastDateKey: string | null;

  /**
   * Attendance against the timetable, not against evaluation rows only.
   * `attendanceEligible` counts held, non-cancelled sessions that fall inside
   * the selected range; `attendanceAttended` counts `present` records for
   * those same sessions.
   */
  attendanceEligible: number;
  attendanceAttended: number;
  attendanceAvailable: boolean;
  /**
   * Homework is only counted when an evaluation row actually recorded a
   * homework state. We never infer a required homework from a session count.
   */
  homeworkRequired: number;
  homeworkSubmitted: number;
  homeworkAvailable: boolean;

  /**
   * Attendance is counted from the later of the filter start and the student's
   * joining date. These fields explain the effective window to the UI.
   */
  attendanceEffectiveFrom?: string | null;
  attendanceSinceJoining?: boolean;
  joinedAt?: string | null;

  /** Active course assignments relevant to this student's group and courses. */
  assignmentTotal?: number;
  assignmentSubmitted?: number;
  assignmentGraded?: number;
};

export type PerformanceTimelinePoint = {
  /** `YYYY-MM` */
  month: string;
  evaluations: number;
  documented: number;
  attendanceRecorded: number;
  presentCount: number;
  attendanceRate: number | null;
  homeworkRecorded: number;
  homeworkCompleted: number;
  homeworkRate: number | null;
  focusRecorded: number;
  avgFocus: number | null;
  participationRecorded: number;
  avgParticipation: number | null;
  notesCount: number;
};

export type TrendDirection =
  | "improving"
  | "declining"
  | "stable"
  | "insufficient";

export type TrendMetric =
  | "attendance"
  | "homework"
  | "focus"
  | "participation";

export type PerformanceMetricTrend = {
  metric: TrendMetric;
  /** Earlier half's value: rate 0–100 or mean 1–5. */
  earlier: number | null;
  /** Recent half's value: rate 0–100 or mean 1–5. */
  recent: number | null;
  delta: number | null;
  samplesEarlier: number;
  samplesRecent: number;
  /** True only when both halves have at least one defined value. */
  comparable: boolean;
  direction: "up" | "down" | "flat" | "unknown";
  /** A move larger than the documented threshold for this metric. */
  significant: boolean;
};

export type PerformanceTrend = {
  direction: TrendDirection;
  reason: "insufficient_evaluations" | "no_comparable_metrics" | null;
  evaluationCount: number;
  earlierCount: number;
  recentCount: number;
  /** First date of the recent half. */
  splitDate: string | null;
  metrics: PerformanceMetricTrend[];
};

export type PerformanceInsightKey =
  | "attendance_strong"
  | "attendance_attention"
  | "homework_strong"
  | "homework_attention"
  | "focus_strong"
  | "focus_attention"
  | "participation_strong"
  | "participation_attention"
  | "trend_improving"
  | "trend_declining"
  | "insufficient_documentation";

export type PerformanceInsight = {
  key: PerformanceInsightKey;
  tone: "strength" | "attention";
  /** The supporting sample size or value, for the tooltip/hint. */
  value: number | null;
};

export type PerformanceHistoryEntry = {
  id: number;
  studentId: number;
  studentName: string;
  sessionId: number;
  dateKey: string;
  groupId: number;
  groupName: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  attendance: AttendanceState | null;
  homework: HomeworkState | null;
  focus: number | null;
  participation: number | null;
  notes: string | null;
};

export type PerformanceStudentRow = {
  studentId: number;
  name: string;
  status: string;
  groupId: number | null;
  groupName: string | null;
  courses: string[];
  summary: PerformanceSummary;
  trend: PerformanceTrend;
  insights: PerformanceInsight[];
  lastEvaluationDateKey: string | null;
};

export type PerformanceOverview = {
  studentCount: number;
  studentsWithEvaluations: number;
  studentsWithoutEvaluations: number;
  summary: PerformanceSummary;
  improving: number;
  declining: number;
  stable: number;
  insufficient: number;
};

export type PerformanceGroupRow = {
  groupId: number;
  name: string;
  level: string | null;
  studentCount: number;
  studentsWithEvaluations: number;
  courses: string[];
  instructors: { id: number | null; name: string }[];
  summary: PerformanceSummary;
  trend: PerformanceTrend;
};

export type PerformanceInstructorRow = {
  instructorId: number | null;
  name: string;
  active: boolean;
  groupCount: number;
  sessionCount: number;
  studentCount: number;
  studentsWithEvaluations: number;
  summary: PerformanceSummary;
  trend: PerformanceTrend;
};

export type PerformanceCourseRow = {
  course: string;
  studentCount: number;
  studentsWithEvaluations: number;
  summary: PerformanceSummary;
  trend: PerformanceTrend;
};

export type PerformanceFilterGroup = {
  id: number;
  name: string;
  level: string | null;
};

export type PerformanceFilterStudent = {
  id: number;
  name: string;
  groupId: number | null;
  groupName: string | null;
};

export type AdminAnalyticsResult = {
  range: { from: string; to: string };
  filters: {
    courses: string[];
    groups: PerformanceFilterGroup[];
    instructors: { id: number; name: string; active: boolean }[];
    students: PerformanceFilterStudent[];
  };
  overview: PerformanceOverview;
  timeline: PerformanceTimelinePoint[];
  groups: PerformanceGroupRow[];
  instructors: PerformanceInstructorRow[];
  courses: PerformanceCourseRow[];
  students: PerformanceStudentRow[];
  studentsTotal: number;
  recentEvaluations: PerformanceHistoryEntry[];
};

export type InstructorAnalyticsResult = {
  range: { from: string; to: string };
  filters: {
    groups: (PerformanceFilterGroup & {
      studentCount: number;
      courses: string[];
    })[];
    courses: string[];
  };
  overview: PerformanceOverview;
  timeline: PerformanceTimelinePoint[];
  groups: PerformanceGroupRow[];
  students: PerformanceStudentRow[];
  recentEvaluations: PerformanceHistoryEntry[];
};

export type StudentProgressCourse = {
  course: string;
  completed: number;
  inProgress: number;
  totalLessons: number;
};

export type StudentQuizResult = {
  id: number;
  course: string;
  lessonId: string;
  score: number;
  total: number;
  submittedAt: string;
};

export type StudentProgressView = {
  /** True only when at least one server-side progress row exists. */
  available: boolean;
  completed: number;
  inProgress: number;
  totalTracked: number;
  byCourse: StudentProgressCourse[];
  /** Most recent attempt per (course, lesson), plus the best score. */
  quizAttempts: StudentQuizResult[];
  bestQuizzes: StudentQuizResult[];
};

export type StudentPerformanceResult = {
  student: {
    id: number;
    name: string;
    status: string;
    groupId: number | null;
    groupName: string | null;
    courses: string[];
  };
  range: { from: string; to: string };
  summary: PerformanceSummary;
  trend: PerformanceTrend;
  timeline: PerformanceTimelinePoint[];
  /** Dated rows for the single interaction/focus chart, gaps included. */
  sessions: PerformanceSessionPoint[];
  insights: PerformanceInsight[];
  latestEvaluation: PerformanceHistoryEntry | null;
  history: PerformanceHistoryEntry[];
  historyTotal: number;
  /** Null when no authoritative server-side progress rows exist. */
  progress: StudentProgressView | null;
};

export const MIN_TREND_EVALUATIONS = 4;

/**
 * Adds course assignments to the homework figure. Called by the server after
 * `summarizePerformance`; kept pure so the denominator rule is testable.
 */
export function mergeAssignmentTotals(
  summary: PerformanceSummary,
  stats: { total: number; submitted: number; graded: number },
): PerformanceSummary {
  summary.assignmentTotal = stats.total;
  summary.assignmentSubmitted = stats.submitted;
  summary.assignmentGraded = stats.graded;
  summary.homeworkRequired += stats.total;
  summary.homeworkSubmitted += stats.submitted;
  summary.homeworkAvailable =
    summary.homeworkRequired > 0 || summary.homeworkAvailable;
  return summary;
}

/** A move smaller than these thresholds is reported as stable, not a trend. */
export const TREND_THRESHOLDS: Record<TrendMetric, number> = {
  attendance: 10,
  homework: 10,
  focus: 0.3,
  participation: 0.3,
};

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round1((numerator / denominator) * 100) : null;
}

function hasNote(notes: string | null): boolean {
  return Boolean(notes && notes.trim().length > 0);
}

function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function minutesFromTime(time: string | null): number | null {
  if (!time) return null;
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * A session is due once its date is in the past, or once its end time has
 * passed on the current day. Future sessions and today's not-yet-finished
 * class never enter the attendance denominator.
 */
export function isSessionDue(
  dateKey: string,
  endTime: string | null,
  now: Date = new Date(),
): boolean {
  const todayKey = localDateKey(now);
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  const end = minutesFromTime(endTime);
  return end !== null && end <= now.getHours() * 60 + now.getMinutes();
}

function isDocumented(row: PerformanceEvaluation): boolean {
  return (
    row.attendance !== null ||
    row.homework !== null ||
    row.focus !== null ||
    row.participation !== null ||
    hasNote(row.notes)
  );
}

function chronological(rows: PerformanceEvaluation[]): PerformanceEvaluation[] {
  return [...rows].sort((left, right) => {
    if (left.dateKey !== right.dateKey) return left.dateKey.localeCompare(right.dateKey);
    return (left.id ?? 0) - (right.id ?? 0);
  });
}

function sessionKey(row: PerformanceEvaluation): string | null {
  if (typeof row.sessionId !== "number") return null;
  return `${row.sessionId}@${row.dateKey}`;
}

export function summarizePerformance(
  rows: PerformanceEvaluation[],
  dueSessions?: PerformanceSession[],
): PerformanceSummary {
  const attendanceRows = rows.filter(row => row.attendance !== null);
  const presentCount = attendanceRows.filter(row => row.attendance === "present").length;
  const homeworkRows = rows.filter(row => row.homework !== null);
  const homeworkCompleted = homeworkRows.filter(row => row.homework === "completed").length;
  const focusValues = rows
    .map(row => row.focus)
    .filter((value): value is number => typeof value === "number");
  const participationValues = rows
    .map(row => row.participation)
    .filter((value): value is number => typeof value === "number");
  const dates = rows
    .map(row => row.dateKey)
    .filter(dateKey => typeof dateKey === "string" && dateKey.length >= 10)
    .sort();

  const dueKeys =
    dueSessions !== undefined
      ? new Set(dueSessions.map(session => `${session.sessionId}@${session.dateKey}`))
      : null;

  const scopedAttendanceRows =
    dueKeys === null
      ? attendanceRows
      : attendanceRows.filter(row => {
          const key = sessionKey(row);
          return key !== null && dueKeys.has(key);
        });
  const seenAttendance = new Set<string>();
  const uniqueAttendanceRows = scopedAttendanceRows.filter(row => {
    const key = sessionKey(row);
    if (key === null) return true;
    if (seenAttendance.has(key)) return false;
    seenAttendance.add(key);
    return true;
  });
  const attendanceAttended = uniqueAttendanceRows.filter(
    row => row.attendance === "present",
  ).length;
  const attendanceEligible =
    dueKeys === null ? attendanceRows.length : dueKeys.size;

  const seenHomework = new Set<string>();
  const scopedHomeworkRows = homeworkRows.filter(row => {
    const key = sessionKey(row) ?? `evaluation:${row.id ?? row.dateKey}`;
    if (seenHomework.has(key)) return false;
    seenHomework.add(key);
    if (dueKeys === null) return true;
    return dueKeys.has(key);
  });
  const homeworkSubmitted = scopedHomeworkRows.filter(
    row => row.homework === "completed",
  ).length;

  return {
    evaluations: rows.length,
    documented: rows.filter(isDocumented).length,
    attendanceRecorded: attendanceRows.length,
    presentCount,
    absentCount: attendanceRows.length - presentCount,
    attendanceRate: rate(presentCount, attendanceRows.length),
    homeworkRecorded: homeworkRows.length,
    homeworkCompleted,
    homeworkNotCompleted: homeworkRows.length - homeworkCompleted,
    homeworkRate: rate(homeworkCompleted, homeworkRows.length),
    focusRecorded: focusValues.length,
    avgFocus: mean(focusValues),
    participationRecorded: participationValues.length,
    avgParticipation: mean(participationValues),
    notesCount: rows.filter(row => hasNote(row.notes)).length,
    firstDateKey: dates[0] ?? null,
    lastDateKey: dates.at(-1) ?? null,
    attendanceEligible,
    attendanceAttended,
    attendanceAvailable: dueKeys === null ? attendanceRows.length > 0 : dueKeys.size > 0,
    homeworkRequired: scopedHomeworkRows.length,
    homeworkSubmitted,
    homeworkAvailable: scopedHomeworkRows.length > 0,
  };
}

/**
 * One dated chart row per held session, plus any evaluated session that is not
 * in the current timetable (a historical row must not disappear). Missing
 * ratings stay `null`, which Recharts renders as a gap rather than a zero.
 */
export function buildSessionTimeline(
  rows: PerformanceEvaluation[],
  dueSessions: PerformanceSession[],
): PerformanceSessionPoint[] {
  const points = new Map<string, PerformanceSessionPoint>();

  const ensure = (session: PerformanceSession): PerformanceSessionPoint => {
    const key = `${session.sessionId}@${session.dateKey}`;
    const existing = points.get(key);
    if (existing) return existing;
    const point: PerformanceSessionPoint = {
      ...session,
      key,
      attendance: null,
      homework: null,
      focus: null,
      participation: null,
    };
    points.set(key, point);
    return point;
  };

  for (const session of dueSessions) ensure(session);

  for (const row of rows) {
    if (typeof row.sessionId !== "number") continue;
    const point = ensure({
      sessionId: row.sessionId,
      dateKey: row.dateKey,
      startTime: row.startTime ?? null,
      endTime: row.endTime ?? null,
      groupId: 0,
      groupName: row.groupName ?? "",
    });
    point.attendance = row.attendance;
    point.homework = row.homework;
    point.focus = row.focus;
    point.participation = row.participation;
    point.startTime = point.startTime ?? row.startTime ?? null;
    point.endTime = point.endTime ?? row.endTime ?? null;
    point.groupName = point.groupName || (row.groupName ?? "");
  }

  return Array.from(points.values()).sort(
    (left, right) =>
      left.dateKey.localeCompare(right.dateKey) ||
      (left.startTime ?? "").localeCompare(right.startTime ?? "") ||
      left.sessionId - right.sessionId,
  );
}

export function buildPerformanceTimeline(
  rows: PerformanceEvaluation[],
): PerformanceTimelinePoint[] {
  const buckets = new Map<
    string,
    {
      evaluations: number;
      documented: number;
      attendanceRecorded: number;
      presentCount: number;
      homeworkRecorded: number;
      homeworkCompleted: number;
      focusValues: number[];
      participationValues: number[];
      notesCount: number;
    }
  >();

  for (const row of rows) {
    const month = row.dateKey.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const bucket = buckets.get(month) ?? {
      evaluations: 0,
      documented: 0,
      attendanceRecorded: 0,
      presentCount: 0,
      homeworkRecorded: 0,
      homeworkCompleted: 0,
      focusValues: [],
      participationValues: [],
      notesCount: 0,
    };
    bucket.evaluations += 1;
    if (isDocumented(row)) bucket.documented += 1;
    if (row.attendance !== null) {
      bucket.attendanceRecorded += 1;
      if (row.attendance === "present") bucket.presentCount += 1;
    }
    if (row.homework !== null) {
      bucket.homeworkRecorded += 1;
      if (row.homework === "completed") bucket.homeworkCompleted += 1;
    }
    if (typeof row.focus === "number") bucket.focusValues.push(row.focus);
    if (typeof row.participation === "number") {
      bucket.participationValues.push(row.participation);
    }
    if (hasNote(row.notes)) bucket.notesCount += 1;
    buckets.set(month, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, bucket]) => ({
      month,
      evaluations: bucket.evaluations,
      documented: bucket.documented,
      attendanceRecorded: bucket.attendanceRecorded,
      presentCount: bucket.presentCount,
      attendanceRate: rate(bucket.presentCount, bucket.attendanceRecorded),
      homeworkRecorded: bucket.homeworkRecorded,
      homeworkCompleted: bucket.homeworkCompleted,
      homeworkRate: rate(bucket.homeworkCompleted, bucket.homeworkRecorded),
      focusRecorded: bucket.focusValues.length,
      avgFocus: mean(bucket.focusValues),
      participationRecorded: bucket.participationValues.length,
      avgParticipation: mean(bucket.participationValues),
      notesCount: bucket.notesCount,
    }));
}

function metricPoint(
  rows: PerformanceEvaluation[],
  metric: TrendMetric,
): { value: number | null; samples: number } {
  if (metric === "attendance" || metric === "homework") {
    const field = metric === "attendance" ? "attendance" : "homework";
    const defined = rows.filter(row => row[field] !== null);
    const success =
      metric === "attendance"
        ? defined.filter(row => row.attendance === "present").length
        : defined.filter(row => row.homework === "completed").length;
    return { value: rate(success, defined.length), samples: defined.length };
  }
  const values = rows
    .map(row => (metric === "focus" ? row.focus : row.participation))
    .filter((value): value is number => typeof value === "number");
  return { value: mean(values), samples: values.length };
}

export function buildPerformanceTrend(
  rows: PerformanceEvaluation[],
): PerformanceTrend {
  const ordered = chronological(rows);
  const metrics: TrendMetric[] = [
    "attendance",
    "homework",
    "focus",
    "participation",
  ];

  if (ordered.length < MIN_TREND_EVALUATIONS) {
    return {
      direction: "insufficient",
      reason: "insufficient_evaluations",
      evaluationCount: ordered.length,
      earlierCount: 0,
      recentCount: 0,
      splitDate: null,
      metrics: metrics.map(metric => ({
        metric,
        earlier: null,
        recent: null,
        delta: null,
        samplesEarlier: 0,
        samplesRecent: 0,
        comparable: false,
        direction: "unknown",
        significant: false,
      })),
    };
  }

  const splitAt = Math.floor(ordered.length / 2);
  const earlier = ordered.slice(0, splitAt);
  const recent = ordered.slice(splitAt);
  const metricTrends = metrics.map(metric => {
    const first = metricPoint(earlier, metric);
    const last = metricPoint(recent, metric);
    const comparable = first.samples > 0 && last.samples > 0;
    const delta =
      comparable && first.value !== null && last.value !== null
        ? round1(last.value - first.value)
        : null;
    const threshold = TREND_THRESHOLDS[metric];
    const direction: PerformanceMetricTrend["direction"] =
      delta === null
        ? "unknown"
        : delta >= threshold
          ? "up"
          : delta <= -threshold
            ? "down"
            : "flat";
    return {
      metric,
      earlier: first.value,
      recent: last.value,
      delta,
      samplesEarlier: first.samples,
      samplesRecent: last.samples,
      comparable,
      direction,
      significant: direction === "up" || direction === "down",
    };
  });

  const comparable = metricTrends.filter(metric => metric.comparable);
  if (comparable.length === 0) {
    return {
      direction: "insufficient",
      reason: "no_comparable_metrics",
      evaluationCount: ordered.length,
      earlierCount: earlier.length,
      recentCount: recent.length,
      splitDate: recent[0]?.dateKey ?? null,
      metrics: metricTrends,
    };
  }

  const ups = comparable.filter(metric => metric.direction === "up").length;
  const downs = comparable.filter(metric => metric.direction === "down").length;
  return {
    direction: ups > downs ? "improving" : downs > ups ? "declining" : "stable",
    reason: null,
    evaluationCount: ordered.length,
    earlierCount: earlier.length,
    recentCount: recent.length,
    splitDate: recent[0]?.dateKey ?? null,
    metrics: metricTrends,
  };
}

/**
 * Strengths / attention points backed only by documented observations.
 * Each threshold also needs a minimum sample, so one lucky rating is not
 * presented as a pattern.
 */
export function buildPerformanceInsights(
  summary: PerformanceSummary,
  trend: PerformanceTrend,
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  if (summary.attendanceRecorded >= 3 && summary.attendanceRate !== null) {
    if (summary.attendanceRate >= 85) {
      insights.push({
        key: "attendance_strong",
        tone: "strength",
        value: summary.attendanceRecorded,
      });
    } else if (summary.attendanceRate <= 60) {
      insights.push({
        key: "attendance_attention",
        tone: "attention",
        value: summary.attendanceRecorded,
      });
    }
  }

  if (summary.homeworkRecorded >= 3 && summary.homeworkRate !== null) {
    if (summary.homeworkRate >= 80) {
      insights.push({
        key: "homework_strong",
        tone: "strength",
        value: summary.homeworkRecorded,
      });
    } else if (summary.homeworkRate <= 50) {
      insights.push({
        key: "homework_attention",
        tone: "attention",
        value: summary.homeworkRecorded,
      });
    }
  }

  if (summary.focusRecorded >= 3 && summary.avgFocus !== null) {
    if (summary.avgFocus >= 4) {
      insights.push({
        key: "focus_strong",
        tone: "strength",
        value: summary.focusRecorded,
      });
    } else if (summary.avgFocus <= 2.5) {
      insights.push({
        key: "focus_attention",
        tone: "attention",
        value: summary.focusRecorded,
      });
    }
  }

  if (summary.participationRecorded >= 3 && summary.avgParticipation !== null) {
    if (summary.avgParticipation >= 4) {
      insights.push({
        key: "participation_strong",
        tone: "strength",
        value: summary.participationRecorded,
      });
    } else if (summary.avgParticipation <= 2.5) {
      insights.push({
        key: "participation_attention",
        tone: "attention",
        value: summary.participationRecorded,
      });
    }
  }

  if (trend.direction === "improving") {
    insights.push({
      key: "trend_improving",
      tone: "strength",
      value: trend.evaluationCount,
    });
  } else if (trend.direction === "declining") {
    insights.push({
      key: "trend_declining",
      tone: "attention",
      value: trend.evaluationCount,
    });
  }

  if (summary.documented < MIN_TREND_EVALUATIONS) {
    insights.push({
      key: "insufficient_documentation",
      tone: "attention",
      value: summary.documented,
    });
  }

  return insights;
}
