import type { ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import type { ScheduleException } from "@/lib/schedule";
import { timeToMinutes } from "@/lib/schedule";

/**
 * Shared pieces for the instructor dashboard.
 *
 * The portal is Arabic-first and reads right-to-left like the student portal,
 * so labels live here instead of being scattered across the three screens.
 * Everything date-wise is driven by `dateKey` strings — the same wall-clock
 * convention the timetable uses — so an evaluation never shifts a day with the
 * viewer's timezone.
 */

export const AR_DAY_LABELS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

export function arabicWeekday(dayOfWeek: number): string {
  return AR_DAY_LABELS[dayOfWeek] ?? "";
}

/** `"2026-10-24"` → `"السبت، 24 أكتوبر"`. */
export function arabicDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString(
    "ar-EG",
    { weekday: "long", day: "numeric", month: "long" },
  );
}

function arabicTime(time: string): string {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time;
  const hours24 = Math.floor(minutes / 60);
  const suffix = hours24 < 12 ? "ص" : "م";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

/** `"17:00"`–`"18:30"` → `"5:00 م – 6:30 م"`. */
export function arabicTimeRange(startTime: string, endTime: string): string {
  return startTime === endTime
    ? arabicTime(startTime)
    : `${arabicTime(startTime)} – ${arabicTime(endTime)}`;
}

// ── Shapes returned by the instructor router ───────────────────────────────

export type InstructorProfile = {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
};

export type InstructorSessionSlot = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
};

export type InstructorGroupRow = {
  id: number;
  name: string;
  level: string | null;
  studentCount: number;
  courses: string[];
  sessions: InstructorSessionSlot[];
};

export type InstructorStudent = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  courses: string[];
};

export type InstructorGroupDetail = {
  group: {
    id: number;
    name: string;
    level: string | null;
    notes: string | null;
    /** Saved by the admin; the report share flow opens this group. */
    whatsappUrl: string | null;
  };
  exceptions: ScheduleException[];
  sessions: (InstructorSessionSlot & {
    instructorId: number | null;
    instructorName: string | null;
    /** True when this caller is the assigned instructor of this slot. */
    mine: boolean;
  })[];
  students: InstructorStudent[];
};

export type EvaluationRow = {
  id: number;
  studentId: number;
  sessionId: number;
  dateKey: string;
  attendance: "present" | "absent" | null;
  homework: "completed" | "not_completed" | null;
  focus: number | null;
  participation: number | null;
  notes: string | null;
  recordedBy: number | null;
};

export type EvaluationRecord = {
  evaluation: EvaluationRow;
  studentName: string;
};

// ── Evaluation drafts ──────────────────────────────────────────────────────

export type EvaluationDraft = {
  attendance: "present" | "absent" | null;
  homework: "completed" | "not_completed" | null;
  focus: number | null;
  participation: number | null;
  notes: string;
};

export const EMPTY_DRAFT: EvaluationDraft = {
  attendance: null,
  homework: null,
  focus: null,
  participation: null,
  notes: "",
};

export function draftFromEvaluation(row: EvaluationRow | undefined): EvaluationDraft {
  if (!row) return EMPTY_DRAFT;
  return {
    attendance: row.attendance,
    homework: row.homework,
    focus: row.focus,
    participation: row.participation,
    notes: row.notes ?? "",
  };
}

/** Notes are compared trimmed — the server stores them trimmed too. */
export function isDraftDirty(draft: EvaluationDraft, saved: EvaluationRow | undefined): boolean {
  if (!saved) {
    return (
      draft.attendance !== null ||
      draft.homework !== null ||
      draft.focus !== null ||
      draft.participation !== null ||
      draft.notes.trim().length > 0
    );
  }
  return (
    draft.attendance !== saved.attendance ||
    draft.homework !== saved.homework ||
    draft.focus !== saved.focus ||
    draft.participation !== saved.participation ||
    draft.notes.trim() !== (saved.notes ?? "")
  );
}

// ── Summaries ──────────────────────────────────────────────────────────────

export type EvaluationSummary = {
  evaluated: number;
  attendanceRecorded: number;
  presentCount: number;
  attendanceRate: number | null;
  homeworkRecorded: number;
  homeworkCompleted: number;
  homeworkRate: number | null;
  avgFocus: number | null;
  avgParticipation: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeEvaluations(
  rows: (EvaluationRow | EvaluationRecord)[],
): EvaluationSummary {
  const evaluations = rows.map(row => ("evaluation" in row ? row.evaluation : row));
  const attendanceRows = evaluations.filter(row => row.attendance !== null);
  const presentCount = attendanceRows.filter(row => row.attendance === "present").length;
  const homeworkRows = evaluations.filter(row => row.homework !== null);
  const homeworkCompleted = homeworkRows.filter(row => row.homework === "completed").length;
  return {
    evaluated: evaluations.length,
    attendanceRecorded: attendanceRows.length,
    presentCount,
    attendanceRate:
      attendanceRows.length > 0 ? (presentCount / attendanceRows.length) * 100 : null,
    homeworkRecorded: homeworkRows.length,
    homeworkCompleted,
    homeworkRate:
      homeworkRows.length > 0 ? (homeworkCompleted / homeworkRows.length) * 100 : null,
    avgFocus: average(
      evaluations
        .map(row => row.focus)
        .filter((value): value is number => value !== null),
    ),
    avgParticipation: average(
      evaluations
        .map(row => row.participation)
        .filter((value): value is number => value !== null),
    ),
  };
}

export function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate)}%`;
}

export function formatScore(value: number | null): string {
  return value === null ? "—" : value.toFixed(1).replace(/\.0$/, "");
}

// ── Small presentational pieces ────────────────────────────────────────────

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-3xl border border-dashed border-border p-12 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {label}
    </div>
  );
}

export function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AttendanceBadge({ value }: { value: "present" | "absent" | null }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">لم يُسجَّل</span>;
  }
  return (
    <span
      className={
        value === "present"
          ? "rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          : "rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300"
      }
    >
      {value === "present" ? "حاضر" : "غائب"}
    </span>
  );
}

export function HomeworkBadge({ value }: { value: "completed" | "not_completed" | null }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">لم يُسجَّل</span>;
  }
  return (
    <span
      className={
        value === "completed"
          ? "rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300"
          : "rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300"
      }
    >
      {value === "completed" ? "سلّم الواجب" : "لم يسلّم"}
    </span>
  );
}

export function CourseChips({ courses }: { courses: string[] }) {
  if (courses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {courses.map(course => (
        <span
          key={course}
          className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
        >
          {course}
        </span>
      ))}
    </div>
  );
}
