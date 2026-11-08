import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { getDb, getStudentById, getStudentProgress, listSessionExceptions, getAssignmentStatsByStudent, getStudentQuizAttempts } from "./db";
import {
  curriculumLessons,
  groupSessions,
  groups,
  instructors,
  studentCourses,
  studentEvaluations,
  students,
} from "../drizzle/schema";
import {
  buildPerformanceInsights,
  buildPerformanceTimeline,
  buildPerformanceTrend,
  buildSessionTimeline,
  isSessionDue,
  mergeAssignmentTotals,
  summarizePerformance,
  type AdminAnalyticsResult,
  type InstructorAnalyticsResult,
  type PerformanceCourseRow,
  type PerformanceEvaluation,
  type PerformanceGroupRow,
  type PerformanceHistoryEntry,
  type PerformanceInstructorRow,
  type PerformanceOverview,
  type PerformanceSession,
  type PerformanceStudentRow,
  type PerformanceSummary,
  type StudentPerformanceResult,
  type StudentProgressView,
} from "../shared/performance";
import {
  buildOccurrences,
  fromDateKey,
  type ScheduleException,
  type ScheduleSession,
} from "../client/src/lib/schedule";

/**
 * Server-side performance analytics.
 *
 * The dashboard never receives raw table dumps and never recalculates the
 * authoritative numbers in the browser. Each loader fetches the evaluations in
 * scope once (joined to their session, group and student), then builds every
 * summary, trend and breakdown from that single result set. That keeps the
 * endpoint count flat instead of one query per student/group/instructor.
 */

const COURSES = ["Scratch", "Robotics", "Web", "Python"] as const;

type RosterStudent = {
  id: number;
  name: string;
  status: string;
  groupId: number | null;
  groupName: string | null;
  groupLevel: string | null;
  courses: string[];
  /** The academy's authoritative join date (`students.createdAt`). */
  joinedAt: string;
};

type EvaluationRow = PerformanceEvaluation & {
  id: number;
  studentId: number;
  studentName: string;
  sessionId: number;
  groupId: number;
  groupName: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  instructorId: number | null;
  instructorName: string | null;
};

type SessionRow = {
  id: number;
  groupId: number;
  groupName: string;
  groupLevel: string | null;
  instructorId: number | null;
  instructorName: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type InstructorRow = {
  id: number;
  name: string;
  active: boolean;
};

type StudentAnalyticsOptions = {
  studentId: number;
  from: string;
  to: string;
  /** Restrict history to these groups (instructor drill-down). */
  groupIds?: number[] | null;
  /** Restrict history to one group. */
  groupId?: number | null;
  /** Restrict history to sessions assigned to this instructor (admin drill-down). */
  instructorId?: number | null;
  historyLimit: number;
  historyOffset: number;
};

function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Explicit dates come validated from the router. The fallbacks only keep direct
 * internal callers (and tests) from opening an unbounded all-time query.
 */
export function resolveAnalyticsRange(from?: string | null, to?: string | null) {
  const end = to?.trim() || localDateKey(new Date());
  if (from?.trim()) return { from: from.trim(), to: end };
  const start = new Date();
  start.setDate(start.getDate() - 180);
  return { from: localDateKey(start), to: end };
}

async function loadRoster(options: {
  groupId?: number | null;
  groupIds?: number[] | null;
  studentId?: number | null;
  activeOnly?: boolean;
}): Promise<RosterStudent[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions: SQL[] = [];
  if (options.activeOnly) conditions.push(eq(students.status, "active"));
  if (options.studentId != null) conditions.push(eq(students.id, options.studentId));
  if (options.groupId != null) {
    conditions.push(eq(students.groupId, options.groupId));
  } else if (options.groupIds != null) {
    if (options.groupIds.length === 0) return [];
    conditions.push(inArray(students.groupId, options.groupIds));
  }

  const rows = await db
    .select({ student: students, group: groups, course: studentCourses.course })
    .from(students)
    .leftJoin(groups, eq(students.groupId, groups.id))
    .leftJoin(studentCourses, eq(studentCourses.studentId, students.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(students.name));

  const byId = new Map<number, RosterStudent>();
  for (const row of rows) {
    const entry = byId.get(row.student.id) ?? {
      id: row.student.id,
      name: row.student.name,
      status: row.student.status,
      groupId: row.student.groupId,
      groupName: row.group?.name ?? null,
      groupLevel: row.group?.level ?? null,
      courses: [] as string[],
      joinedAt: localDateKey(row.student.createdAt),
    };
    if (row.course && !entry.courses.includes(row.course)) {
      entry.courses.push(row.course);
    }
    byId.set(row.student.id, entry);
  }
  return Array.from(byId.values());
}

async function loadGroups() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: groups.id, name: groups.name, level: groups.level })
    .from(groups)
    .orderBy(asc(groups.name));
}

async function loadInstructors(): Promise<InstructorRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: instructors.id,
      name: instructors.name,
      active: instructors.active,
    })
    .from(instructors)
    .orderBy(asc(instructors.name));
}

async function loadSessions(groupIds?: number[] | null): Promise<SessionRow[]> {
  const db = await getDb();
  if (!db) return [];
  if (groupIds != null && groupIds.length === 0) return [];
  const rows = await db
    .select({
      id: groupSessions.id,
      groupId: groupSessions.groupId,
      groupName: groups.name,
      groupLevel: groups.level,
      instructorId: groupSessions.instructorId,
      instructorName: instructors.name,
      dayOfWeek: groupSessions.dayOfWeek,
      startTime: groupSessions.startTime,
      endTime: groupSessions.endTime,
    })
    .from(groupSessions)
    .innerJoin(groups, eq(groupSessions.groupId, groups.id))
    .leftJoin(instructors, eq(groupSessions.instructorId, instructors.id))
    .where(
      groupIds != null && groupIds.length > 0
        ? inArray(groupSessions.groupId, groupIds)
        : undefined,
    )
    .orderBy(
      asc(groupSessions.dayOfWeek),
      asc(groupSessions.startTime),
      asc(groupSessions.id),
    );
  return rows;
}

/**
 * Expands the weekly timetable into dated sessions and keeps only the ones
 * that are already due. A cancellation disappears in `buildOccurrences`; a
 * moved week is emitted on its new date. Today's slot is due only after its
 * end time, so an evening class is not counted as missing in the morning.
 */
function buildDueSessions(
  groupId: number,
  sessions: SessionRow[],
  exceptions: ScheduleException[],
  from: string,
  to: string,
): PerformanceSession[] {
  const scoped = sessions.filter(session => session.groupId === groupId);
  if (scoped.length === 0) return [];

  const scheduleSessions: ScheduleSession[] = scoped.map(session => ({
    id: session.id,
    groupId: session.groupId,
    groupName: session.groupName,
    groupLevel: session.groupLevel,
    dayOfWeek: session.dayOfWeek,
    startTime: session.startTime,
    endTime: session.endTime,
    location: null,
    notes: null,
    instructorId: session.instructorId,
    instructorName: session.instructorName,
  }));

  return buildOccurrences(
    scheduleSessions,
    exceptions,
    fromDateKey(from),
    fromDateKey(to),
  )
    .filter(occurrence =>
      isSessionDue(occurrence.dateKey, occurrence.endTime),
    )
    .map(occurrence => ({
      sessionId: occurrence.sessionId,
      dateKey: occurrence.dateKey,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      groupId: occurrence.groupId,
      groupName: occurrence.groupName,
    }));
}

function dueSessionsByGroup(
  sessions: SessionRow[],
  exceptions: ScheduleException[],
  from: string,
  to: string,
): Map<number, PerformanceSession[]> {
  const map = new Map<number, PerformanceSession[]>();
  for (const groupId of new Set(sessions.map(session => session.groupId))) {
    map.set(groupId, buildDueSessions(groupId, sessions, exceptions, from, to));
  }
  return map;
}

async function loadDueSessionsForGroup(
  groupId: number,
  from: string,
  to: string,
  instructorId?: number | null,
): Promise<PerformanceSession[]> {
  const [sessions, exceptions] = await Promise.all([
    loadSessions([groupId]),
    listSessionExceptions(from, to),
  ]);
  const scoped =
    instructorId != null
      ? sessions.filter(session => session.instructorId === instructorId)
      : sessions;
  return buildDueSessions(groupId, scoped, exceptions, from, to);
}

async function loadEvaluations(options: {
  from: string;
  to: string;
  groupId?: number | null;
  groupIds?: number[] | null;
  instructorId?: number | null;
  studentId?: number | null;
  studentIds?: number[] | null;
}): Promise<EvaluationRow[]> {
  const db = await getDb();
  if (!db) return [];
  if (options.studentIds != null && options.studentIds.length === 0) return [];
  if (options.groupIds != null && options.groupIds.length === 0) return [];

  const conditions: SQL[] = [
    gte(studentEvaluations.dateKey, options.from),
    lte(studentEvaluations.dateKey, options.to),
  ];
  if (options.groupId != null) {
    conditions.push(eq(groupSessions.groupId, options.groupId));
  } else if (options.groupIds != null && options.groupIds.length > 0) {
    conditions.push(inArray(groupSessions.groupId, options.groupIds));
  }
  if (options.instructorId != null) {
    conditions.push(eq(groupSessions.instructorId, options.instructorId));
  }
  if (options.studentId != null) {
    conditions.push(eq(studentEvaluations.studentId, options.studentId));
  } else if (options.studentIds != null) {
    conditions.push(inArray(studentEvaluations.studentId, options.studentIds));
  }

  const rows = await db
    .select({
      id: studentEvaluations.id,
      studentId: studentEvaluations.studentId,
      studentName: students.name,
      sessionId: studentEvaluations.sessionId,
      groupId: groupSessions.groupId,
      groupName: groups.name,
      dayOfWeek: groupSessions.dayOfWeek,
      startTime: groupSessions.startTime,
      endTime: groupSessions.endTime,
      instructorId: groupSessions.instructorId,
      instructorName: instructors.name,
      dateKey: studentEvaluations.dateKey,
      attendance: studentEvaluations.attendance,
      homework: studentEvaluations.homework,
      focus: studentEvaluations.focus,
      participation: studentEvaluations.participation,
      notes: studentEvaluations.notes,
    })
    .from(studentEvaluations)
    .innerJoin(students, eq(studentEvaluations.studentId, students.id))
    .innerJoin(groupSessions, eq(studentEvaluations.sessionId, groupSessions.id))
    .innerJoin(groups, eq(groupSessions.groupId, groups.id))
    .leftJoin(instructors, eq(groupSessions.instructorId, instructors.id))
    .where(and(...conditions))
    .orderBy(asc(studentEvaluations.dateKey), asc(studentEvaluations.id));

  return rows;
}

function groupByStudent(rows: EvaluationRow[]): Map<number, EvaluationRow[]> {
  const map = new Map<number, EvaluationRow[]>();
  for (const row of rows) {
    const list = map.get(row.studentId) ?? [];
    list.push(row);
    map.set(row.studentId, list);
  }
  return map;
}

function toHistoryEntry(row: EvaluationRow): PerformanceHistoryEntry {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    sessionId: row.sessionId,
    dateKey: row.dateKey,
    groupId: row.groupId,
    groupName: row.groupName,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    attendance: row.attendance,
    homework: row.homework,
    focus: row.focus,
    participation: row.participation,
    notes: row.notes,
  };
}

export function effectiveAttendanceStart(rangeFrom: string, joinedAt: string | null) {
  // Sessions before the student joined must never appear in their denominator.
  return joinedAt && joinedAt > rangeFrom ? joinedAt : rangeFrom;
}

function buildStudentRow(
  student: RosterStudent,
  evaluations: EvaluationRow[],
  rangeFrom: string,
  dueSessions?: PerformanceSession[],
): PerformanceStudentRow {
  const effectiveFrom = effectiveAttendanceStart(rangeFrom, student.joinedAt);
  const scopedEvaluations = evaluations.filter(row => row.dateKey >= effectiveFrom);
  const scopedDueSessions = dueSessions?.filter(
    session => session.dateKey >= effectiveFrom,
  );
  const summary = summarizePerformance(scopedEvaluations, scopedDueSessions);
  summary.attendanceEffectiveFrom = effectiveFrom;
  summary.attendanceSinceJoining = effectiveFrom > rangeFrom;
  summary.joinedAt = student.joinedAt;
  const trend = buildPerformanceTrend(scopedEvaluations);
  return {
    studentId: student.id,
    name: student.name,
    status: student.status,
    groupId: student.groupId,
    groupName: student.groupName,
    courses: student.courses,
    summary,
    trend,
    insights: buildPerformanceInsights(summary, trend),
    lastEvaluationDateKey: summary.lastDateKey,
  };
}

function buildStudentRows(
  roster: RosterStudent[],
  byStudent: Map<number, EvaluationRow[]>,
  rangeFrom: string,
  dueByGroup?: Map<number, PerformanceSession[]>,
): PerformanceStudentRow[] {
  return roster.map(student => {
    const dueSessions =
      dueByGroup != null && student.groupId != null
        ? dueByGroup.get(student.groupId) ?? []
        : undefined;
    return buildStudentRow(
      student,
      byStudent.get(student.id) ?? [],
      rangeFrom,
      dueSessions,
    );
  });
}

/**
 * Adds course assignments to the homework figure. The denominator is every
 * active assignment in the student's group and one of their enrolled courses;
 * the numerator is a stored submission. No automatic penalty is invented for
 * late work — the submission still counts, and `late` is shown to the teacher.
 */
async function attachAssignmentTotals(
  rows: PerformanceStudentRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const stats = await getAssignmentStatsByStudent(rows.map(row => row.studentId));
  for (const row of rows) {
    const bucket = stats.get(row.studentId) ?? { total: 0, submitted: 0, graded: 0 };
    mergeAssignmentTotals(row.summary, bucket);
  }
}

function buildOverview(
  roster: RosterStudent[],
  evaluations: EvaluationRow[],
  byStudent: Map<number, EvaluationRow[]>,
): PerformanceOverview {
  const rows = roster.map(student => byStudent.get(student.id) ?? []);
  const trends = rows.map(row => buildPerformanceTrend(row).direction);
  return {
    studentCount: roster.length,
    studentsWithEvaluations: rows.filter(row => row.length > 0).length,
    studentsWithoutEvaluations: rows.filter(row => row.length === 0).length,
    summary: summarizePerformance(evaluations),
    improving: trends.filter(direction => direction === "improving").length,
    declining: trends.filter(direction => direction === "declining").length,
    stable: trends.filter(direction => direction === "stable").length,
    insufficient: trends.filter(direction => direction === "insufficient").length,
  };
}

function distinctCourses(roster: RosterStudent[]): string[] {
  const set = new Set<string>();
  for (const student of roster) for (const course of student.courses) set.add(course);
  return Array.from(set).sort();
}

function groupInstructors(
  groupId: number,
  sessions: SessionRow[],
): { id: number | null; name: string }[] {
  const byId = new Map<number | null, string>();
  for (const session of sessions) {
    if (session.groupId !== groupId) continue;
    if (session.instructorId == null) continue;
    byId.set(session.instructorId, session.instructorName ?? "مدرّب");
  }
  return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
}

function buildGroupRows(
  groupsList: { id: number; name: string; level: string | null }[],
  sessions: SessionRow[],
  roster: RosterStudent[],
  evaluations: EvaluationRow[],
): PerformanceGroupRow[] {
  return groupsList.map(group => {
    const groupRoster = roster.filter(student => student.groupId === group.id);
    const groupEvaluations = evaluations.filter(row => row.groupId === group.id);
    const summary = summarizePerformance(groupEvaluations);
    const trend = buildPerformanceTrend(groupEvaluations);
    return {
      groupId: group.id,
      name: group.name,
      level: group.level,
      studentCount: groupRoster.length,
      studentsWithEvaluations: groupRoster.filter(student =>
        groupEvaluations.some(row => row.studentId === student.id),
      ).length,
      courses: distinctCourses(groupRoster),
      instructors: groupInstructors(group.id, sessions),
      summary,
      trend,
    };
  });
}

function buildInstructorRows(
  instructorsList: InstructorRow[],
  sessions: SessionRow[],
  roster: RosterStudent[],
  evaluations: EvaluationRow[],
): PerformanceInstructorRow[] {
  const rows: PerformanceInstructorRow[] = instructorsList.map(instructor => {
    const ownSessions = sessions.filter(
      session => session.instructorId === instructor.id,
    );
    const groupIds = new Set(ownSessions.map(session => session.groupId));
    const instructorRoster = roster.filter(
      student => student.groupId != null && groupIds.has(student.groupId),
    );
    const ownEvaluations = evaluations.filter(
      row => row.instructorId === instructor.id,
    );
    const summary = summarizePerformance(ownEvaluations);
    return {
      instructorId: instructor.id,
      name: instructor.name,
      active: instructor.active,
      groupCount: groupIds.size,
      sessionCount: ownSessions.length,
      studentCount: instructorRoster.length,
      studentsWithEvaluations: new Set(
        ownEvaluations.map(row => row.studentId),
      ).size,
      summary,
      trend: buildPerformanceTrend(ownEvaluations),
    };
  });

  // Unassigned timetable slots can still carry evaluations; keeping them in a
  // separate row stops them from being silently attributed to a real teacher.
  const unassignedSessions = sessions.filter(
    session => session.instructorId == null,
  );
  const unassignedEvaluations = evaluations.filter(
    row => row.instructorId == null,
  );
  if (unassignedSessions.length > 0 || unassignedEvaluations.length > 0) {
    const groupIds = new Set(unassignedSessions.map(session => session.groupId));
    const summary = summarizePerformance(unassignedEvaluations);
    rows.push({
      instructorId: null,
      name: "بدون مدرّب مسند",
      active: false,
      groupCount: groupIds.size,
      sessionCount: unassignedSessions.length,
      studentCount: roster.filter(
        student => student.groupId != null && groupIds.has(student.groupId),
      ).length,
      studentsWithEvaluations: new Set(
        unassignedEvaluations.map(row => row.studentId),
      ).size,
      summary,
      trend: buildPerformanceTrend(unassignedEvaluations),
    });
  }

  return rows.sort((left, right) => {
    if (left.summary.evaluations !== right.summary.evaluations) {
      return right.summary.evaluations - left.summary.evaluations;
    }
    return left.name.localeCompare(right.name, "ar");
  });
}

function buildCourseRows(
  roster: RosterStudent[],
  evaluations: EvaluationRow[],
): PerformanceCourseRow[] {
  return COURSES.map(course => {
    const courseRoster = roster.filter(student =>
      student.courses.includes(course),
    );
    const studentIds = new Set(courseRoster.map(student => student.id));
    const courseEvaluations = evaluations.filter(row =>
      studentIds.has(row.studentId),
    );
    const summary = summarizePerformance(courseEvaluations);
    return {
      course,
      studentCount: courseRoster.length,
      studentsWithEvaluations: courseRoster.filter(student =>
        courseEvaluations.some(row => row.studentId === student.id),
      ).length,
      summary,
      trend: buildPerformanceTrend(courseEvaluations),
    };
  });
}

function analyticsSort(rows: PerformanceStudentRow[]): PerformanceStudentRow[] {
  return [...rows].sort((left, right) => {
    if (left.summary.evaluations !== right.summary.evaluations) {
      return right.summary.evaluations - left.summary.evaluations;
    }
    return left.name.localeCompare(right.name, "ar");
  });
}

async function loadProgress(
  studentId: number,
  courses: string[],
): Promise<StudentProgressView | null> {
  const [progressRows, quizRows] = await Promise.all([
    getStudentProgress(studentId),
    getStudentQuizAttempts(studentId),
  ]);
  const relevant = progressRows.filter(
    row =>
      row.curriculum != null &&
      courses.includes(row.curriculum.course as string),
  );
  const relevantQuizzes = quizRows.filter(row => courses.includes(row.course as string));
  if (relevant.length === 0 && relevantQuizzes.length === 0) return null;

  const db = await getDb();
  if (!db) return null;
  const curriculumIds = Array.from(
    new Set(relevant.map(row => row.progress.curriculumId)),
  );
  const lessonRows = curriculumIds.length
    ? await db
        .select({
          curriculumId: curriculumLessons.curriculumId,
          id: curriculumLessons.id,
        })
        .from(curriculumLessons)
        .where(inArray(curriculumLessons.curriculumId, curriculumIds))
    : [];
  const totals = new Map<number, number>();
  for (const row of lessonRows) {
    totals.set(row.curriculumId, (totals.get(row.curriculumId) ?? 0) + 1);
  }

  const byCourseMap = new Map<
    string,
    { completed: number; inProgress: number; totalLessons: number }
  >();
  let completed = 0;
  let inProgress = 0;
  for (const row of relevant) {
    const course = row.curriculum!.course as string;
    const bucket = byCourseMap.get(course) ?? {
      completed: 0,
      inProgress: 0,
      totalLessons: totals.get(row.progress.curriculumId) ?? 0,
    };
    if (row.progress.status === "completed") {
      bucket.completed += 1;
      completed += 1;
    } else if (row.progress.status === "in_progress") {
      bucket.inProgress += 1;
      inProgress += 1;
    }
    byCourseMap.set(course, bucket);
  }

  // Newest attempt first; the best score per lesson is what the report shows.
  const seen = new Set<string>();
  const latestPerLesson = relevantQuizzes.filter(row => {
    const key = `${row.course}:${row.lessonId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const bestMap = new Map<string, (typeof relevantQuizzes)[number]>();
  for (const row of relevantQuizzes) {
    const key = `${row.course}:${row.lessonId}`;
    const current = bestMap.get(key);
    if (
      !current ||
      row.score / Math.max(row.total, 1) >
        current.score / Math.max(current.total, 1)
    ) {
      bestMap.set(key, row);
    }
  }
  const toQuizResult = (row: (typeof relevantQuizzes)[number]) => ({
    id: row.id,
    course: row.course as string,
    lessonId: row.lessonId,
    score: row.score,
    total: row.total,
    submittedAt: row.submittedAt.toISOString(),
  });

  return {
    available: true,
    completed,
    inProgress,
    totalTracked: relevant.length,
    byCourse: Array.from(byCourseMap.entries())
      .map(([course, bucket]) => ({ course, ...bucket }))
      .sort((left, right) => left.course.localeCompare(right.course)),
    quizAttempts: latestPerLesson.map(toQuizResult),
    bestQuizzes: Array.from(bestMap.values()).map(toQuizResult),
  };
}

export async function getAdminAnalytics(input: {
  from?: string | null;
  to?: string | null;
  course?: string | null;
  groupId?: number | null;
  instructorId?: number | null;
  studentId?: number | null;
  /** Free-text name search, used by the compact admin dashboard. */
  search?: string | null;
  page: number;
  pageSize: number;
}): Promise<AdminAnalyticsResult> {
  const range = resolveAnalyticsRange(input.from, input.to);

  const [allRoster, groupsList, sessions, instructorsList, exceptions] =
    await Promise.all([
      loadRoster({ activeOnly: false }),
      loadGroups(),
      loadSessions(),
      loadInstructors(),
      listSessionExceptions(range.from, range.to),
    ]);

  const dueByGroup = dueSessionsByGroup(
    sessions,
    exceptions,
    range.from,
    range.to,
  );

  let roster = allRoster;
  if (input.studentId != null) {
    roster = roster.filter(student => student.id === input.studentId);
  }
  if (input.groupId != null) {
    roster = roster.filter(student => student.groupId === input.groupId);
  }
  const searchTerm = input.search?.trim().toLocaleLowerCase("ar") ?? "";
  if (searchTerm) {
    roster = roster.filter(student =>
      student.name.toLocaleLowerCase("ar").includes(searchTerm),
    );
  }
  if (input.instructorId != null) {
    // An instructor drill-down is about the learners currently in that
    // instructor's groups. Without this, the roster column would list every
    // student in the academy beside one teacher's evaluation totals.
    const instructorGroupIds = new Set(
      sessions
        .filter(session => session.instructorId === input.instructorId)
        .map(session => session.groupId),
    );
    roster = roster.filter(
      student =>
        student.groupId != null && instructorGroupIds.has(student.groupId),
    );
  }
  if (input.course) {
    roster = roster.filter(student => student.courses.includes(input.course!));
  }

  const evaluations = await loadEvaluations({
    from: range.from,
    to: range.to,
    groupId: input.groupId,
    instructorId: input.instructorId,
    studentId: input.studentId,
    // Course is the only filter without a session column. The rest are applied
    // straight to the evaluation query, so a student who moved groups keeps
    // their historical rows in that group's report.
    studentIds: (input.course || searchTerm) && input.studentId == null
      ? roster.map(student => student.id)
      : null,
  });
  const byStudent = groupByStudent(evaluations);

  const studentRows = analyticsSort(
    buildStudentRows(roster, byStudent, range.from, dueByGroup),
  );
  await attachAssignmentTotals(studentRows);
  const overview = buildOverview(roster, evaluations, byStudent);
  const timeline = buildPerformanceTimeline(evaluations);

  const visibleGroups = groupsList.filter(group => {
    if (input.groupId != null) return group.id === input.groupId;
    if (input.instructorId != null) {
      if (!sessions.some(session => session.groupId === group.id)) return false;
      return sessions.some(
        session =>
          session.groupId === group.id &&
          session.instructorId === input.instructorId,
      );
    }
    if (input.course || input.studentId != null) {
      return (
        roster.some(student => student.groupId === group.id) ||
        evaluations.some(row => row.groupId === group.id)
      );
    }
    return true;
  });

  const groupRows = buildGroupRows(
    visibleGroups,
    sessions,
    roster,
    evaluations,
  ).sort((left, right) => {
    if (left.summary.evaluations !== right.summary.evaluations) {
      return right.summary.evaluations - left.summary.evaluations;
    }
    return left.name.localeCompare(right.name, "ar");
  });

  let instructorRows = buildInstructorRows(
    instructorsList,
    input.groupId != null
      ? sessions.filter(session => session.groupId === input.groupId)
      : sessions,
    roster,
    evaluations,
  );
  if (input.instructorId != null) {
    instructorRows = instructorRows.filter(
      row => row.instructorId === input.instructorId,
    );
  } else {
    instructorRows = instructorRows.filter(
      row =>
        row.sessionCount > 0 ||
        row.summary.evaluations > 0 ||
        row.studentCount > 0,
    );
  }

  const courseRows = buildCourseRows(roster, evaluations).filter(
    row => !input.course || row.course === input.course,
  );

  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  const page = Math.max(input.page, 1);
  const offset = (page - 1) * pageSize;

  return {
    range,
    filters: {
      courses: [...COURSES],
      groups: groupsList,
      instructors: instructorsList.map(instructor => ({
        id: instructor.id,
        name: instructor.name,
        active: instructor.active,
      })),
      students: allRoster.map(student => ({
        id: student.id,
        name: student.name,
        groupId: student.groupId,
        groupName: student.groupName,
      })),
    },
    overview,
    timeline,
    groups: groupRows,
    instructors: instructorRows,
    courses: courseRows,
    students: studentRows.slice(offset, offset + pageSize),
    studentsTotal: studentRows.length,
    recentEvaluations: [...evaluations]
      .reverse()
      .slice(0, 20)
      .map(toHistoryEntry),
  };
}

export async function getInstructorAnalytics(
  instructorId: number,
  input: {
    from?: string | null;
    to?: string | null;
    course?: string | null;
    groupId?: number | null;
  },
): Promise<InstructorAnalyticsResult> {
  const range = resolveAnalyticsRange(input.from, input.to);

  // The timetable is the only assignment mechanism: no slot in a group, no
  // analytics for it. This mirrors `getGroupDetailForInstructor`.
  const [allSessions, groupsList] = await Promise.all([
    loadSessions(),
    loadGroups(),
  ]);
  const authorizedGroupIds = Array.from(
    new Set(
      allSessions
        .filter(session => session.instructorId === instructorId)
        .map(session => session.groupId),
    ),
  );
  const scopedGroupIds =
    input.groupId != null ? [input.groupId] : authorizedGroupIds;
  const selectedGroupIds = scopedGroupIds.filter(groupId =>
    authorizedGroupIds.includes(groupId),
  );
  if (selectedGroupIds.length === 0) {
    return {
      range,
      filters: { groups: [], courses: [] },
      overview: buildOverview([], [], new Map()),
      timeline: [],
      groups: [],
      students: [],
      recentEvaluations: [],
    };
  }

  const scopedSessions = allSessions.filter(session =>
    selectedGroupIds.includes(session.groupId),
  );
  const [allRoster, exceptions] = await Promise.all([
    loadRoster({ groupIds: selectedGroupIds, activeOnly: true }),
    listSessionExceptions(range.from, range.to),
  ]);
  const dueByGroup = dueSessionsByGroup(
    scopedSessions,
    exceptions,
    range.from,
    range.to,
  );
  const roster = input.course
    ? allRoster.filter(student => student.courses.includes(input.course!))
    : allRoster;

  const evaluations = await loadEvaluations({
    from: range.from,
    to: range.to,
    groupIds: selectedGroupIds,
    studentIds: roster.map(student => student.id),
  });
  const byStudent = groupByStudent(evaluations);

  const groupsForFilters = groupsList
    .filter(group => authorizedGroupIds.includes(group.id))
    .map(group => {
      const groupRoster = allRoster.filter(student => student.groupId === group.id);
      return {
        ...group,
        studentCount: groupRoster.length,
        courses: distinctCourses(groupRoster),
      };
    });

  const studentRows = analyticsSort(
    buildStudentRows(roster, byStudent, range.from, dueByGroup),
  );
  await attachAssignmentTotals(studentRows);

  return {
    range,
    filters: {
      groups: groupsForFilters,
      courses: distinctCourses(allRoster),
    },
    overview: buildOverview(roster, evaluations, byStudent),
    timeline: buildPerformanceTimeline(evaluations),
    groups: buildGroupRows(
      groupsList.filter(group => selectedGroupIds.includes(group.id)),
      scopedSessions,
      roster,
      evaluations,
    ).sort((left, right) => {
      if (left.summary.evaluations !== right.summary.evaluations) {
        return right.summary.evaluations - left.summary.evaluations;
      }
      return left.name.localeCompare(right.name, "ar");
    }),
    students: studentRows,
    recentEvaluations: [...evaluations]
      .reverse()
      .slice(0, 20)
      .map(toHistoryEntry),
  };
}

export async function getStudentPerformance(
  options: StudentAnalyticsOptions,
): Promise<StudentPerformanceResult | null> {
  const profile = await getStudentById(options.studentId);
  if (!profile) return null;

  // Sessions before the student joined are outside every denominator. The
  // student's persisted created-at is the academy's enrolment date; there is no
  // second enrolment table in this schema to disagree with it.
  const joinedAt = localDateKey(profile.createdAt);
  const effectiveFrom = joinedAt > options.from ? joinedAt : options.from;

  const evaluations = await loadEvaluations({
    from: options.from,
    to: options.to,
    studentId: options.studentId,
    studentIds: [options.studentId],
    groupId: options.groupId,
    groupIds: options.groupIds,
    instructorId: options.instructorId,
  });
  const scopedEvaluations = evaluations.filter(row => row.dateKey >= effectiveFrom);
  // The timetable is the authority for "due sessions". Without a known group
  // there is no denominator, so the summary falls back to recorded rows only.
  const dueGroupId = options.groupId ?? profile.groupId ?? null;
  const dueSessions =
    dueGroupId != null
      ? await loadDueSessionsForGroup(
          dueGroupId,
          effectiveFrom,
          options.to,
          options.instructorId,
        )
      : undefined;
  const summary = summarizePerformance(scopedEvaluations, dueSessions);
  summary.attendanceEffectiveFrom = effectiveFrom;
  summary.attendanceSinceJoining = effectiveFrom > options.from;
  summary.joinedAt = joinedAt;
  const assignmentStats = (
    await getAssignmentStatsByStudent([options.studentId])
  ).get(options.studentId) ?? { total: 0, submitted: 0, graded: 0 };
  mergeAssignmentTotals(summary, assignmentStats);

  const trend = buildPerformanceTrend(scopedEvaluations);
  const descending = [...evaluations].reverse();
  const history = descending
    .slice(options.historyOffset, options.historyOffset + options.historyLimit)
    .map(toHistoryEntry);

  return {
    student: {
      id: profile.id,
      name: profile.name,
      status: profile.status,
      groupId: profile.groupId,
      groupName: profile.group?.name ?? null,
      courses: profile.courses,
    },
    range: { from: options.from, to: options.to },
    summary,
    trend,
    timeline: buildPerformanceTimeline(scopedEvaluations),
    sessions: buildSessionTimeline(scopedEvaluations, dueSessions ?? []),
    insights: buildPerformanceInsights(summary, trend),
    latestEvaluation:
      scopedEvaluations.length > 0
        ? toHistoryEntry(scopedEvaluations[scopedEvaluations.length - 1])
        : null,
    history,
    historyTotal: evaluations.length,
    progress: await loadProgress(options.studentId, profile.courses),
  };
}
