import type { ReactNode } from "react";
import {
  BookOpenCheck,
  CalendarCheck2,
  ClipboardCheck,
  Flame,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  arabicDateLabel,
  arabicTimeRange,
} from "@/pages/instructor/shared";
import type {
  PerformanceSessionPoint,
  PerformanceStudentRow,
  PerformanceSummary,
} from "@shared/performance";

/**
 * The compact performance dashboard.
 *
 * Only two numbers are presented per student (attendance and homework) plus a
 * single chronological interaction/focus chart. The old monthly rates,
 * trend badges, insight lists and comparison tables were removed from this
 * section on purpose.
 */

const INTERACTION_COLOR = "rgb(var(--primary))";
const FOCUS_COLOR = "rgb(14 165 233)";

const ratingConfig = {
  participation: { label: "التفاعل", color: INTERACTION_COLOR },
  focus: { label: "التركيز", color: FOCUS_COLOR },
} satisfies ChartConfig;

function attendanceLabel(value: PerformanceSessionPoint["attendance"]): string {
  if (value === "present") return "حاضر";
  if (value === "absent") return "غائب";
  return "غير مسجّل";
}

function homeworkLabel(value: PerformanceSessionPoint["homework"]): string {
  if (value === "completed") return "مسلّم";
  if (value === "not_completed") return "غير مسلّم";
  return "غير مسجّل";
}

function validRating(value: number | null): number | null {
  return typeof value === "number" && value >= 1 && value <= 5 ? value : null;
}

function shortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
  });
}

export function AttendanceHomeworkCards({
  summary,
  className,
}: {
  summary: PerformanceSummary;
  className?: string;
}) {
  const assignmentTotal = summary.assignmentTotal ?? 0;
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <MetricCard
        icon={<CalendarCheck2 className="h-4 w-4" />}
        label={summary.attendanceSinceJoining ? "الحضور منذ الانضمام — Sessions since joining" : "الحضور"}
        available={summary.attendanceAvailable}
        value={summary.attendanceAttended}
        total={summary.attendanceEligible}
        unit="حصة"
        sentence={
          summary.attendanceAvailable
            ? summary.attendanceSinceJoining && summary.attendanceEffectiveFrom
              ? `حضر ${summary.attendanceAttended} من أصل ${summary.attendanceEligible} حصة منذ انضمامه في ${summary.attendanceEffectiveFrom}`
              : `حضر ${summary.attendanceAttended} من أصل ${summary.attendanceEligible} حصة مستحقة`
            : "لا توجد بيانات كافية عن الحصص المستحقة"
        }
        tone="primary"
      />
      <MetricCard
        icon={<ClipboardCheck className="h-4 w-4" />}
        label="الواجب"
        available={summary.homeworkAvailable}
        value={summary.homeworkSubmitted}
        total={summary.homeworkRequired}
        unit="واجب"
        sentence={
          summary.homeworkAvailable
            ? assignmentTotal > 0
              ? `سلّم ${summary.homeworkSubmitted} من أصل ${summary.homeworkRequired} واجبًا، منها ${assignmentTotal} واجبًا من المقرر`
              : `سلّم ${summary.homeworkSubmitted} من أصل ${summary.homeworkRequired} واجبًا مطلوبًا`
            : "لا توجد بيانات كافية عن الواجبات المطلوبة"
        }
        tone="sky"
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  available,
  value,
  total,
  unit,
  sentence,
  tone,
}: {
  icon: ReactNode;
  label: string;
  available: boolean;
  value: number;
  total: number;
  unit: string;
  sentence: string;
  tone: "primary" | "sky";
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  const barClass = tone === "primary" ? "bg-primary" : "bg-sky-500";

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      role="group"
      aria-label={`${label}: ${sentence}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{label}</span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl",
            toneClass,
          )}
        >
          {icon}
        </span>
      </div>

      {available ? (
        <>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums">{value}</span>
            <span className="text-sm font-semibold text-muted-foreground">
              من {total} {unit}
            </span>
          </div>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {sentence}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", barClass)}
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      ) : (
        <div className="mt-3 flex min-h-[4.5rem] items-center rounded-xl border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground">
          لا توجد بيانات كافية
        </div>
      )}
    </div>
  );
}

type ChartRow = PerformanceSessionPoint & { label: string };

type ChartDotProps = {
  cx?: number;
  cy?: number;
  active?: boolean;
};

const FLAME_PATH =
  "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

const STAR_PATH =
  "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";

function FlameDot({ cx, cy, active = false }: ChartDotProps) {
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const scale = active ? 0.85 : 0.65;
  const offset = 12 * scale;
  return (
    <path
      d={FLAME_PATH}
      transform={`translate(${cx - offset} ${cy - offset}) scale(${scale})`}
      fill={INTERACTION_COLOR}
      stroke="none"
      pointerEvents="none"
    />
  );
}

function StarDot({ cx, cy, active = false }: ChartDotProps) {
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const scale = active ? 0.85 : 0.65;
  const offset = 12 * scale;
  return (
    <path
      d={STAR_PATH}
      transform={`translate(${cx - offset} ${cy - offset}) scale(${scale})`}
      fill={FOCUS_COLOR}
      stroke="none"
      pointerEvents="none"
    />
  );
}

export function InteractionFocusChart({
  sessions,
  compact = false,
}: {
  sessions: PerformanceSessionPoint[];
  compact?: boolean;
}) {
  const dateCounts = new Map<string, number>();
  for (const session of sessions) {
    dateCounts.set(session.dateKey, (dateCounts.get(session.dateKey) ?? 0) + 1);
  }

  const rows: ChartRow[] = sessions.map(session => ({
    ...session,
    participation: validRating(session.participation),
    focus: validRating(session.focus),
    label:
      (dateCounts.get(session.dateKey) ?? 0) > 1 && session.startTime
        ? `${shortDate(session.dateKey)} · ${session.startTime}`
        : shortDate(session.dateKey),
  }));

  const hasRatings = rows.some(
    row => row.participation !== null || row.focus !== null,
  );

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-card",
        compact ? "p-4" : "p-4 sm:p-5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="h-4 w-4 text-primary" />
            تطور التفاعل والتركيز
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            كل نقطة تمثل حصة بتاريخها. الفجوة تعني أن التقييم غير مسجّل، وليست
            قيمة صفر.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold">
          <LegendItem kind="flame" label="التفاعل" />
          <LegendItem kind="star" label="التركيز" />
        </div>
      </div>

      {hasRatings ? (
        <ChartContainer
          config={ratingConfig}
          className={cn(
            "aspect-auto w-full",
            compact ? "mt-3 h-48" : "mt-4 h-64 sm:h-72",
          )}
          role="img"
          aria-label="رسم بياني زمني لمستوى التفاعل والتركيز في كل حصة"
        >
          <LineChart
            data={rows}
            margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={18}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              width={28}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<SessionTooltip />}
              cursor={{ stroke: "rgb(var(--border))", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="participation"
              name="التفاعل"
              stroke="var(--color-participation)"
              strokeWidth={2.5}
              connectNulls={false}
              dot={<FlameDot />}
              activeDot={<FlameDot active />}
            />
            <Line
              type="monotone"
              dataKey="focus"
              name="التركيز"
              stroke="var(--color-focus)"
              strokeWidth={2.5}
              connectNulls={false}
              dot={<StarDot />}
              activeDot={<StarDot active />}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-border text-center text-xs leading-6 text-muted-foreground">
          لا توجد تقييمات تفاعل أو تركيز كافية لعرض الرسم البياني.
        </div>
      )}
    </section>
  );
}

function LegendItem({
  kind,
  label,
}: {
  kind: "flame" | "star";
  label: string;
}) {
  const Icon = kind === "flame" ? Flame : Star;
  const color = kind === "flame" ? INTERACTION_COLOR : FOCUS_COLOR;
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon
        className="h-3.5 w-3.5"
        style={{ color }}
        fill="currentColor"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

type TooltipPayload = { payload?: ChartRow };

function SessionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-w-[13rem] rounded-xl border border-border/60 bg-background px-3 py-2.5 text-xs shadow-xl"
    >
      <div className="font-bold">{arabicDateLabel(point.dateKey)}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {point.groupName || "حصّة"}
        {point.startTime && point.endTime
          ? ` · ${arabicTimeRange(point.startTime, point.endTime)}`
          : ""}
      </div>
      <div className="mt-2 grid gap-1.5">
        <TooltipRow
          kind="flame"
          label="التفاعل"
          value={point.participation}
        />
        <TooltipRow
          kind="star"
          label="التركيز"
          value={point.focus}
        />
      </div>
      <div className="mt-2 border-t border-border/60 pt-2 text-[11px] leading-5 text-muted-foreground">
        الحضور: {attendanceLabel(point.attendance)} · الواجب:{" "}
        {homeworkLabel(point.homework)}
      </div>
    </div>
  );
}

function TooltipRow({
  kind,
  label,
  value,
}: {
  kind: "flame" | "star";
  label: string;
  value: number | null;
}) {
  const Icon = kind === "flame" ? Flame : Star;
  const color = kind === "flame" ? INTERACTION_COLOR : FOCUS_COLOR;
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon
          className="h-3 w-3"
          style={{ color }}
          fill="currentColor"
          aria-hidden="true"
        />
        {label}
      </span>
      <span className="font-bold tabular-nums">
        {value === null ? "غير مسجّل" : `${value} / 5`}
      </span>
    </div>
  );
}

export function StudentPerformanceTable({
  rows,
  onSelect,
  selectedStudentId,
  emptyLabel = "لا يوجد طلاب مطابقون للفلاتر الحالية.",
}: {
  rows: PerformanceStudentRow[];
  onSelect?: (row: PerformanceStudentRow) => void;
  selectedStudentId?: number | null;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-right text-sm">
        <thead className="text-[11px] text-muted-foreground">
          <tr className="border-b border-border/70">
            <th className="px-4 py-3 font-semibold">الطالب</th>
            <th className="hidden px-4 py-3 font-semibold sm:table-cell">
              المجموعة
            </th>
            <th className="px-4 py-3 font-semibold">الحضور</th>
            <th className="px-4 py-3 font-semibold">الواجب</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const selected = row.studentId === selectedStudentId;
            return (
              <tr
                key={row.studentId}
                className={cn(
                  "border-b border-border/50 last:border-0",
                  selected && "bg-primary/5",
                )}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">{row.name}</div>
                  {row.courses.length > 0 ? (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.courses.join(" · ")}
                    </div>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                  {row.groupName ?? "بدون مجموعة"}
                </td>
                <td className="px-4 py-3">
                  <CompactMetric
                    available={row.summary.attendanceAvailable}
                    value={row.summary.attendanceAttended}
                    total={row.summary.attendanceEligible}
                    unit="حصة"
                  />
                </td>
                <td className="px-4 py-3">
                  <CompactMetric
                    available={row.summary.homeworkAvailable}
                    value={row.summary.homeworkSubmitted}
                    total={row.summary.homeworkRequired}
                    unit="واجب"
                  />
                </td>
                <td className="px-4 py-3 text-end">
                  {onSelect ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => onSelect(row)}
                      aria-pressed={selected}
                    >
                      عرض الأداء
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompactMetric({
  available,
  value,
  total,
  unit,
}: {
  available: boolean;
  value: number;
  total: number;
  unit: string;
}) {
  if (!available) {
    return (
      <span className="text-[11px] text-muted-foreground">
        لا توجد بيانات كافية
      </span>
    );
  }
  return (
    <span className="tabular-nums">
      <b>{value}</b>
      <span className="text-muted-foreground"> من {total} </span>
      {unit}
    </span>
  );
}

/**
 * Cards + one chart, shared by the student portal, the instructor drill-down
 * and the admin student dialog.
 */
export function StudentPerformancePanel({
  summary,
  sessions,
  title,
  description,
  action,
  compact = false,
}: {
  summary: PerformanceSummary;
  sessions: PerformanceSessionPoint[];
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {title || description || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-base font-bold">{title}</h3> : null}
            {description ? (
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <AttendanceHomeworkCards summary={summary} />
      <InteractionFocusChart sessions={sessions} compact={compact} />
    </div>
  );
}

export function PerformanceUnavailable({
  message = "لا توجد بيانات كافية لعرض أداء هذا الطالب في الفترة المحددة.",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
      <BookOpenCheck className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs font-semibold text-muted-foreground">{message}</p>
    </div>
  );
}
