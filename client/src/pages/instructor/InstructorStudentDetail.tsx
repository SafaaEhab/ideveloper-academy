import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarX2,
  Clock,
  GraduationCap,
  History,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentPerformancePanel } from "@/components/performance/PerformanceWidgets";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import {
  addDays,
  buildOccurrences,
  fromDateKey,
  toDateKey,
  type ScheduleSession,
} from "@/lib/schedule";
import {
  arabicDateLabel,
  arabicTimeRange,
  arabicWeekday,
  AttendanceBadge,
  CourseChips,
  EmptyBlock,
  formatScore,
  HomeworkBadge,
  LoadingBlock,
  summarizeEvaluations,
  type EvaluationRecord,
  type EvaluationRow,
  type InstructorGroupDetail,
} from "./shared";

const LOOKBACK_DAYS = 150;
const LOOKAHEAD_DAYS = 14;

type HistoryEntry = {
  key: string;
  dateKey: string;
  sessionId: number;
  startTime: string;
  endTime: string;
  location: string | null;
  evaluation: EvaluationRow | null;
  moved: boolean;
  upcoming: boolean;
};

export default function InstructorStudentDetail({
  groupId,
  studentId,
}: {
  groupId: number;
  studentId: number;
}) {
  const detailQuery = trpc.instructor.groupDetail.useQuery(
    { groupId },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );
  const evaluationsQuery = trpc.instructor.evaluations.useQuery(
    { groupId, studentId },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );

  const detail = detailQuery.data as InstructorGroupDetail | undefined;
  const records = (evaluationsQuery.data ?? []) as EvaluationRecord[];

  const [sessionFilter, setSessionFilter] = useState("all");

  const { from, to } = useMemo(() => {
    const today = new Date();
    return { from: addDays(today, -LOOKBACK_DAYS), to: addDays(today, LOOKAHEAD_DAYS) };
  }, []);

  const occurrences = useMemo(() => {
    if (!detail) return [];
    const sessions: ScheduleSession[] = detail.sessions.map(session => ({
      ...session,
      groupId: detail.group.id,
      groupName: detail.group.name,
      groupLevel: detail.group.level,
    }));
    return buildOccurrences(sessions, detail.exceptions, from, to);
  }, [detail, from, to]);

  const student = detail?.students.find(item => item.id === studentId);

  const performanceQuery = trpc.instructor.studentPerformance.useQuery(
    {
      groupId,
      studentId,
      from: toDateKey(from),
      to: toDateKey(to),
      limit: 1,
      offset: 0,
    },
    {
      retry: false,
      enabled: Boolean(student),
      refetchInterval: LIVE_REFETCH_INTERVAL,
    },
  );

  const summary = useMemo(() => summarizeEvaluations(records), [records]);

  const history = useMemo<HistoryEntry[]>(() => {
    const todayKey = toDateKey(new Date());
    const evaluationByKey = new Map<string, EvaluationRow>();
    for (const record of records) {
      evaluationByKey.set(
        `${record.evaluation.sessionId}@${record.evaluation.dateKey}`,
        record.evaluation,
      );
    }

    const entries: HistoryEntry[] = [];
    const covered = new Set<string>();
    for (const occurrence of occurrences) {
      const key = `${occurrence.sessionId}@${occurrence.dateKey}`;
      const evaluation = evaluationByKey.get(key) ?? null;
      const upcoming = occurrence.dateKey > todayKey;
      if (!evaluation && upcoming) continue;
      entries.push({
        key,
        dateKey: occurrence.dateKey,
        sessionId: occurrence.sessionId,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        location: occurrence.location,
        evaluation,
        moved: occurrence.moved,
        upcoming,
      });
      if (evaluation) covered.add(key);
    }

    for (const record of records) {
      const key = `${record.evaluation.sessionId}@${record.evaluation.dateKey}`;
      if (covered.has(key)) continue;
      const slot = detail?.sessions.find(item => item.id === record.evaluation.sessionId);
      entries.push({
        key,
        dateKey: record.evaluation.dateKey,
        sessionId: record.evaluation.sessionId,
        startTime: slot?.startTime ?? "",
        endTime: slot?.endTime ?? "",
        location: slot?.location ?? null,
        evaluation: record.evaluation,
        moved: false,
        upcoming: false,
      });
    }

    return entries.sort(
      (left, right) =>
        right.dateKey.localeCompare(left.dateKey) ||
        right.startTime.localeCompare(left.startTime),
    );
  }, [occurrences, records, detail]);

  const visibleHistory = useMemo(() => {
    if (sessionFilter === "all") return history;
    const sessionId = Number(sessionFilter);
    return history.filter(entry => entry.sessionId === sessionId);
  }, [history, sessionFilter]);

  if (detailQuery.isLoading) {
    return <LoadingBlock label="جارٍ تحميل بيانات الطالب…" />;
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="space-y-6 py-10">
        <EmptyBlock
          icon={CalendarX2}
          title="تعذّر فتح هذه المجموعة"
          description="المجموعة غير مسندة لك أو تم إيقافها."
          action={
            <Link
              href="/instructor"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              العودة إلى مجموعاتي
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/instructor/group/${groupId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع إلى {detail.group.name}
        </Link>

        {!student ? (
          <div className="mt-6">
            <EmptyBlock
              icon={Users}
              title="الطالب غير موجود في هذه المجموعة"
              description="يمكن أن يكون الطالب انتقل لمجموعة أخرى أو تم إيقافه. راجع كشف المجموعة الحالي."
              action={
                <Link
                  href={`/instructor/group/${groupId}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  فتح كشف المجموعة
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {student.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {detail.group.name}
                  </span>
                  {student.phone ? (
                    <span dir="ltr" className="tabular-nums">
                      {student.phone}
                    </span>
                  ) : null}
                  {student.email ? (
                    <span dir="ltr" className="truncate">
                      {student.email}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3">
                  <CourseChips courses={student.courses} />
                </div>
              </div>
              <Link
                href={`/instructor/group/${groupId}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <CalendarCheck2 className="h-4 w-4" />
                تسجيل تقييم حصة
              </Link>
            </div>

            <div className="mt-6">
              {performanceQuery.data ? (
                <>
                  <StudentPerformancePanel
                    summary={performanceQuery.data.summary}
                    sessions={performanceQuery.data.sessions}
                    title="الحضور والواجب والتفاعل"
                    description={`${performanceQuery.data.range.from} ← ${performanceQuery.data.range.to} · الأرقام محسوبة من الحصص المستحقة وسجلات التقييم داخل هذه الفترة.`}
                  />
                  {performanceQuery.data.progress ? (
                    <div className="mt-3 rounded-2xl border border-border bg-card p-4">
                      <h3 className="text-sm font-bold">تقدم الدروس والاختبارات المحفوظ</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                          {performanceQuery.data.progress.completed} درس مكتمل
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
                          {performanceQuery.data.progress.bestQuizzes.length} اختبار محفوظ
                        </span>
                      </div>
                      {performanceQuery.data.progress.bestQuizzes.length > 0 ? (
                        <div className="mt-3 space-y-1.5">
                          {performanceQuery.data.progress.bestQuizzes.slice(0, 10).map(quiz => (
                            <div key={`${quiz.course}:${quiz.lessonId}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                              <span>{quiz.course} · {quiz.lessonId}</span>
                              <span className="tabular-nums">{quiz.score}/{quiz.total}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : performanceQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  جارٍ حساب الحضور والواجب…
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  تعذّر تحميل ملخص الأداء لهذا الطالب.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <History className="h-4 w-4 text-primary" />
                  سجل التقييمات
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summary.evaluated} تقييم مسجّل عبر{" "}
                  {new Set(records.map(record => record.evaluation.dateKey)).size} حصة
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Select value={sessionFilter} onValueChange={setSessionFilter}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="كل المواعيد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المواعيد</SelectItem>
                    {detail.sessions.map(session => (
                      <SelectItem key={session.id} value={String(session.id)}>
                        {arabicWeekday(session.dayOfWeek)} ·{" "}
                        {arabicTimeRange(session.startTime, session.endTime)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {evaluationsQuery.isLoading ? (
              <LoadingBlock label="جارٍ تحميل سجل التقييمات…" />
            ) : evaluationsQuery.isError ? (
              <EmptyBlock
                icon={CalendarX2}
                title="تعذّر تحميل سجل التقييمات"
                description="جرّب إعادة المحاولة بعد لحظات."
                action={
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => evaluationsQuery.refetch()}
                  >
                    إعادة المحاولة
                  </Button>
                }
              />
            ) : visibleHistory.length === 0 ? (
              <EmptyBlock
                icon={UserRound}
                title="لسه مفيش تقييمات للطالب"
                description="افتح كشف المجموعة، اختار الحصة والتاريخ، وسجّل الحضور والواجب والتقييم."
              />
            ) : (
              <div className="space-y-2">
                {visibleHistory.map(entry => (
                  <div
                    key={entry.key}
                    className="rounded-2xl border border-border/70 bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {arabicDateLabel(entry.dateKey)}
                          </span>
                          {entry.moved ? (
                            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                              منقولة
                            </span>
                          ) : null}
                          {entry.upcoming ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              قادمة
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{arabicWeekday(fromDateKey(entry.dateKey).getDay())}</span>
                          {entry.startTime ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {arabicTimeRange(entry.startTime, entry.endTime)}
                            </span>
                          ) : null}
                          {entry.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {entry.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.evaluation ? (
                          <>
                            <AttendanceBadge value={entry.evaluation.attendance} />
                            <HomeworkBadge value={entry.evaluation.homework} />
                            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                              تركيز {formatScore(entry.evaluation.focus)}/5
                            </span>
                            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                              مشاركة {formatScore(entry.evaluation.participation)}/5
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">لم يُقيَّم</span>
                        )}
                      </div>
                    </div>
                    {entry.evaluation?.notes ? (
                      <p className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-sm leading-6 text-muted-foreground">
                        {entry.evaluation.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
