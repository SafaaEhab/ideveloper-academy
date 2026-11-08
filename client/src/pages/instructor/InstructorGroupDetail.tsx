import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  Loader2,
  MapPin,
  MessageCircle,
  Save,
  Search,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import {
  addDays,
  buildOccurrences,
  toDateKey,
  type Occurrence,
  type ScheduleSession,
} from "@/lib/schedule";
import {
  arabicDateLabel,
  arabicTimeRange,
  arabicWeekday,
  CourseChips,
  draftFromEvaluation,
  EmptyBlock,
  formatPercent,
  formatScore,
  isDraftDirty,
  LoadingBlock,
  StatCard,
  summarizeEvaluations,
  type EvaluationDraft,
  type EvaluationRecord,
  type EvaluationRow,
  type EvaluationSummary,
  type InstructorGroupDetail,
} from "./shared";
import EvaluationReportDialog from "./EvaluationReportDialog";
import InstructorAssignments from "@/components/InstructorAssignments";

const LOOKBACK_DAYS = 70;
const LOOKAHEAD_DAYS = 28;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "حصل خطأ غير متوقع، جرّب تاني";
}

export default function InstructorGroupDetail({
  groupId,
  instructorId,
}: {
  groupId: number;
  instructorId: number;
}) {
  const utils = trpc.useUtils();
  const detailQuery = trpc.instructor.groupDetail.useQuery(
    { groupId },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );
  const evaluationsQuery = trpc.instructor.evaluations.useQuery(
    { groupId },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );
  const saveEvaluation = trpc.instructor.saveEvaluation.useMutation();

  const detail = detailQuery.data as InstructorGroupDetail | undefined;
  const records = (evaluationsQuery.data ?? []) as EvaluationRecord[];

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
    return buildOccurrences(sessions, detail.exceptions, from, to).sort(
      (left, right) =>
        right.dateKey.localeCompare(left.dateKey) ||
        right.startTime.localeCompare(left.startTime) ||
        left.sessionId - right.sessionId,
    );
  }, [detail, from, to]);

  const defaultKey = useMemo(() => {
    if (occurrences.length === 0) return "";
    const todayKey = toDateKey(new Date());
    // Prefer a slot this instructor may write to, so the sheet does not open
    // read-only on a colleague's session when their own class is right there.
    const writable = occurrences.filter(
      item => item.instructorId === null || item.instructorId === instructorId,
    );
    const todayOccurrence = writable.find(item => item.dateKey === todayKey);
    if (todayOccurrence) return todayOccurrence.key;
    const latestPast = writable.find(item => item.dateKey < todayKey);
    if (latestPast) return latestPast.key;
    if (writable.length > 0) return writable[writable.length - 1].key;
    return occurrences[0].key;
  }, [occurrences, instructorId]);

  const [selectedKey, setSelectedKey] = useState("");
  const effectiveKey = occurrences.some(item => item.key === selectedKey)
    ? selectedKey
    : defaultKey;
  const occurrence: Occurrence | null =
    occurrences.find(item => item.key === effectiveKey) ?? null;

  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, EvaluationDraft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    setDrafts({});
  }, [occurrence?.key]);

  const savedByStudent = useMemo(() => {
    const map = new Map<number, EvaluationRow>();
    if (!occurrence) return map;
    for (const record of records) {
      if (
        record.evaluation.sessionId === occurrence.sessionId &&
        record.evaluation.dateKey === occurrence.dateKey
      ) {
        map.set(record.evaluation.studentId, record.evaluation);
      }
    }
    return map;
  }, [records, occurrence]);

  const students = detail?.students ?? [];

  const summariesByStudent = useMemo(() => {
    const grouped = new Map<number, EvaluationRow[]>();
    for (const record of records) {
      const list = grouped.get(record.evaluation.studentId) ?? [];
      list.push(record.evaluation);
      grouped.set(record.evaluation.studentId, list);
    }
    const summaries = new Map<number, EvaluationSummary>();
    for (const [studentId, rows] of grouped) {
      summaries.set(studentId, summarizeEvaluations(rows));
    }
    return summaries;
  }, [records]);

  const groupSummary = useMemo(() => summarizeEvaluations(records), [records]);

  const groupCourses = useMemo(
    () => Array.from(new Set(students.flatMap(student => student.courses))),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      student =>
        student.name.toLowerCase().includes(term) ||
        (student.phone ?? "").includes(term) ||
        (student.email ?? "").toLowerCase().includes(term),
    );
  }, [students, search]);

  const draftFor = (studentId: number): EvaluationDraft =>
    drafts[studentId] ?? draftFromEvaluation(savedByStudent.get(studentId));

  const updateDraft = (studentId: number, patch: Partial<EvaluationDraft>) => {
    setDrafts(previous => {
      const base =
        previous[studentId] ?? draftFromEvaluation(savedByStudent.get(studentId));
      return { ...previous, [studentId]: { ...base, ...patch } };
    });
  };

  const dirtyStudentIds = useMemo(() => {
    if (!occurrence) return [];
    return (detail?.students ?? [])
      .filter(student =>
        isDraftDirty(
          drafts[student.id] ?? draftFromEvaluation(savedByStudent.get(student.id)),
          savedByStudent.get(student.id),
        ),
      )
      .map(student => student.id);
  }, [detail, drafts, savedByStudent, occurrence]);

  const canEvaluate =
    occurrence !== null &&
    (occurrence.instructorId === null || occurrence.instructorId === instructorId);
  const evaluationsReady = !evaluationsQuery.isLoading && !evaluationsQuery.isError;

  const markVisible = (patch: Partial<EvaluationDraft>) => {
    setDrafts(previous => {
      const next = { ...previous };
      for (const student of filteredStudents) {
        const base =
          next[student.id] ?? draftFromEvaluation(savedByStudent.get(student.id));
        next[student.id] = { ...base, ...patch };
      }
      return next;
    });
  };

  const payloadFor = (studentId: number) => {
    const draft = draftFor(studentId);
    return {
      sessionId: occurrence!.sessionId,
      studentId,
      dateKey: occurrence!.dateKey,
      attendance: draft.attendance,
      homework: draft.homework,
      focus: draft.focus,
      participation: draft.participation,
      notes: draft.notes.trim() ? draft.notes.trim() : null,
    };
  };

  const saveOne = async (studentId: number) => {
    if (!occurrence || !canEvaluate) return;
    setSavingId(studentId);
    try {
      await saveEvaluation.mutateAsync(payloadFor(studentId));
      await utils.instructor.evaluations.invalidate({ groupId });
      setDrafts(previous => {
        const next = { ...previous };
        delete next[studentId];
        return next;
      });
      toast.success("تم حفظ تقييم الطالب");
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    if (!occurrence || !canEvaluate || dirtyStudentIds.length === 0) return;
    setSavingAll(true);
    let saved = 0;
    try {
      for (const studentId of dirtyStudentIds) {
        await saveEvaluation.mutateAsync(payloadFor(studentId));
        saved += 1;
      }
      await utils.instructor.evaluations.invalidate({ groupId });
      setDrafts({});
      toast.success(`تم حفظ ${saved} تقييم`);
    } catch (error) {
      if (saved > 0) await utils.instructor.evaluations.invalidate({ groupId });
      toast.error(messageOf(error));
    } finally {
      setSavingAll(false);
    }
  };

  if (detailQuery.isLoading) {
    return <LoadingBlock label="جارٍ تحميل بيانات المجموعة…" />;
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="space-y-6 py-10">
        <EmptyBlock
          icon={CalendarX2}
          title="تعذّر فتح هذه المجموعة"
          description="المجموعة غير مسندة لك أو تم إيقافها. لو الإسناد اتغيّر من لوحة الإدارة، ارجع لمجموعاتك."
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
          href="/instructor"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          كل المجموعات
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {detail.group.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {detail.group.level ? <span>{detail.group.level}</span> : null}
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {students.length} طالب
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {occurrences.length} حصة في آخر {LOOKBACK_DAYS + LOOKAHEAD_DAYS} يوم
              </span>
            </div>
            {detail.group.notes ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                {detail.group.notes}
              </p>
            ) : null}
          </div>
          <CourseChips courses={groupCourses} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="نسبة الحضور"
          value={formatPercent(groupSummary.attendanceRate)}
          hint={`${groupSummary.presentCount} من ${groupSummary.attendanceRecorded} حصة مسجّلة`}
          icon={CalendarCheck2}
        />
        <StatCard
          label="تسليم الواجب"
          value={formatPercent(groupSummary.homeworkRate)}
          hint={`${groupSummary.homeworkCompleted} من ${groupSummary.homeworkRecorded} واجب`}
          icon={ClipboardCheck}
        />
        <StatCard
          label="متوسط التركيز"
          value={formatScore(groupSummary.avgFocus)}
          hint="من 5"
          icon={Target}
        />
        <StatCard
          label="متوسط المشاركة"
          value={formatScore(groupSummary.avgParticipation)}
          hint="من 5"
          icon={Activity}
        />
      </div>

      <InstructorAssignments
        groupId={groupId}
        courses={groupCourses}
        sessions={detail.sessions.map(session => ({
          id: session.id,
          dayOfWeek: session.dayOfWeek,
          startTime: session.startTime,
          endTime: session.endTime,
        }))}
      />

      <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-lg font-bold">كشف تقييم الحصة</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اختار الحصة والتاريخ، سجّل الحضور والواجب والتقييم، وبعدها احفظ. كل
              تقييم مرتبط بالطالب والحصة والتاريخ.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {dirtyStudentIds.length > 0 ? (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {dirtyStudentIds.length} تقييم غير محفوظ
                </span>
              ) : null}
              {dirtyStudentIds.length > 0 ? (
                <Button
                  className="rounded-2xl"
                  disabled={!canEvaluate || savingAll}
                  onClick={saveAll}
                >
                  {savingAll ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="me-2 h-4 w-4" />
                  )}
                  حفظ الكل
                </Button>
              ) : null}
              <Button
                type="button"
                className="rounded-2xl bg-[#128C7E] text-white hover:bg-[#0E7468]"
                disabled={
                  !occurrence ||
                  students.length === 0 ||
                  dirtyStudentIds.length > 0 ||
                  savingAll ||
                  savingId !== null ||
                  !evaluationsReady
                }
                title={
                  dirtyStudentIds.length > 0
                    ? "احفظ التعديلات الأول عشان التقرير يعرض القيم المحفوظة"
                    : "تجهيز صور التقييم لكل طلاب الحصة"
                }
                onClick={() => setReportOpen(true)}
              >
                <MessageCircle className="me-2 h-4 w-4" />
                إرسال التقييم الكامل إلى واتساب
              </Button>
            </div>
            <span className="text-[11px] leading-5 text-muted-foreground">
              {dirtyStudentIds.length > 0
                ? "التقرير بيتجهز من التقييمات المحفوظة — احفظ التعديلات الأول."
                : "صور A4 لكل طلاب الحصة مع التقييمات المحفوظة."}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <span className="mb-2 block text-xs font-semibold text-muted-foreground">
              الحصة / التاريخ
            </span>
            <Select
              value={effectiveKey}
              onValueChange={setSelectedKey}
              disabled={occurrences.length === 0}
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder="لا توجد حصص" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {occurrences.map(item => (
                  <SelectItem key={item.key} value={item.key}>
                    {`${arabicDateLabel(item.dateKey)} · ${arabicTimeRange(item.startTime, item.endTime)}${
                      item.instructorId !== instructorId && item.instructorName
                        ? ` · ${item.instructorName}`
                        : ""
                    }`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-2 block text-xs font-semibold text-muted-foreground">
              فلترة الطلاب
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="اسم الطالب أو رقم الموبايل…"
                className="h-12 rounded-2xl ps-10"
              />
            </div>
          </div>
        </div>

        {occurrence ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <CalendarCheck2 className="h-4 w-4 text-primary" />
              {arabicDateLabel(occurrence.dateKey)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {arabicTimeRange(occurrence.startTime, occurrence.endTime)}
            </span>
            <span>{arabicWeekday(occurrence.dayOfWeek)}</span>
            {occurrence.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {occurrence.location}
              </span>
            ) : null}
            {occurrence.moved ? (
              <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                حصة منقولة
              </span>
            ) : null}
            <span className="text-xs">
              {occurrence.instructorName
                ? `المدرّب: ${occurrence.instructorName}`
                : "الحصة غير مسندة لمدرّب"}
            </span>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            مفيش حصص مجدولة لهذه المجموعة في الفترة الحالية. الإدارة تضيف المواعيد
            من لوحة التحكم.
          </p>
        )}

        {occurrence && !canEvaluate ? (
          <div className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
            الحصة دي مسندة لمدرّب تاني، فتقدر تشوف كشف المجموعة لكن تسجيل التقييم
            متاح لمدرّب الحصة فقط. اختار حصة من مواعيدك من قائمة الحصص.
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={!canEvaluate || !evaluationsReady || savingAll}
            onClick={() => markVisible({ attendance: "present" })}
          >
            تحضير الكل
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={!canEvaluate || !evaluationsReady || savingAll}
            onClick={() => markVisible({ attendance: "absent" })}
          >
            غياب الكل
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={!canEvaluate || !evaluationsReady || savingAll}
            onClick={() => markVisible({ homework: "completed" })}
          >
            الكل سلّم الواجب
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={!canEvaluate || !evaluationsReady || savingAll}
            onClick={() => markVisible({ homework: "not_completed" })}
          >
            الكل لم يسلّم
          </Button>
        </div>
      </section>

      {students.length === 0 ? (
        <EmptyBlock
          icon={Users}
          title="لا يوجد طلاب مفعّلون في المجموعة"
          description="لما الإدارة تضيف طلاب للمجموعة هتظهر أسماؤهم هنا جاهزين للتقييم."
        />
      ) : evaluationsQuery.isLoading ? (
        <LoadingBlock label="جارٍ تحميل تقييمات المجموعة…" />
      ) : evaluationsQuery.isError ? (
        <EmptyBlock
          icon={CalendarX2}
          title="تعذّر تحميل التقييمات"
          description="مش قادرين نجيب تقييمات المجموعة دلوقتي. جرّب إعادة المحاولة."
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
      ) : filteredStudents.length === 0 ? (
        <EmptyBlock
          icon={Search}
          title="مفيش نتائج للبحث"
          description="جرّب اسم تاني أو امسح خانة البحث لعرض كل الطلاب."
        />
      ) : (
        <div className="space-y-3">
          {filteredStudents.map(student => {
            const draft = draftFor(student.id);
            const saved = savedByStudent.get(student.id);
            const dirty = isDraftDirty(draft, saved);
            const summary = summariesByStudent.get(student.id);
            const busy = savingId === student.id;
            return (
              <div
                key={student.id}
                className={`rounded-2xl border bg-card p-4 transition ${
                  dirty ? "border-amber-500/50" : "border-border/70"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/instructor/group/${groupId}/student/${student.id}`}
                      className="inline-flex items-center gap-1.5 text-base font-bold transition hover:text-primary"
                    >
                      {student.name}
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {student.phone ? <span dir="ltr">{student.phone}</span> : null}
                      {student.courses.length > 0 ? (
                        <span>{student.courses.join(" · ")}</span>
                      ) : null}
                      {summary && summary.evaluated > 0 ? (
                        <span>
                          حضور {formatPercent(summary.attendanceRate)} · واجب{" "}
                          {formatPercent(summary.homeworkRate)} · تركيز{" "}
                          {formatScore(summary.avgFocus)}
                        </span>
                      ) : (
                        <span>لسه من غير تقييمات سابقة</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {saved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        محفوظ
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">لم يُقيَّم</span>
                    )}
                    {dirty ? (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        غير محفوظ
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      className="rounded-xl"
                      disabled={!dirty || !canEvaluate || savingAll || busy}
                      onClick={() => saveOne(student.id)}
                    >
                      {busy ? (
                        <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="me-1.5 h-3.5 w-3.5" />
                      )}
                      حفظ
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                      الحضور
                    </span>
                    <div className="flex gap-1.5">
                      <ChoiceButton
                        active={draft.attendance === "present"}
                        activeClassName="border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        disabled={!canEvaluate}
                        onClick={() =>
                          updateDraft(student.id, {
                            attendance:
                              draft.attendance === "present" ? null : "present",
                          })
                        }
                      >
                        حاضر
                      </ChoiceButton>
                      <ChoiceButton
                        active={draft.attendance === "absent"}
                        activeClassName="border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        disabled={!canEvaluate}
                        onClick={() =>
                          updateDraft(student.id, {
                            attendance:
                              draft.attendance === "absent" ? null : "absent",
                          })
                        }
                      >
                        غائب
                      </ChoiceButton>
                    </div>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                      الواجب
                    </span>
                    <div className="flex gap-1.5">
                      <ChoiceButton
                        active={draft.homework === "completed"}
                        activeClassName="border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        disabled={!canEvaluate}
                        onClick={() =>
                          updateDraft(student.id, {
                            homework:
                              draft.homework === "completed" ? null : "completed",
                          })
                        }
                      >
                        سلّم
                      </ChoiceButton>
                      <ChoiceButton
                        active={draft.homework === "not_completed"}
                        activeClassName="border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        disabled={!canEvaluate}
                        onClick={() =>
                          updateDraft(student.id, {
                            homework:
                              draft.homework === "not_completed"
                                ? null
                                : "not_completed",
                          })
                        }
                      >
                        لم يسلّم
                      </ChoiceButton>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <RatingPicker
                    label="التركيز"
                    value={draft.focus}
                    disabled={!canEvaluate}
                    onChange={value => updateDraft(student.id, { focus: value })}
                  />
                  <RatingPicker
                    label="المشاركة"
                    value={draft.participation}
                    disabled={!canEvaluate}
                    onChange={value =>
                      updateDraft(student.id, { participation: value })
                    }
                  />
                </div>

                <Textarea
                  value={draft.notes}
                  maxLength={500}
                  rows={2}
                  disabled={!canEvaluate}
                  onChange={event => updateDraft(student.id, { notes: event.target.value })}
                  placeholder="ملاحظة عن أداء الطالب في الحصة (اختياري) — 500 حرف كحد أقصى"
                  className="mt-3 min-h-[64px] resize-y rounded-xl"
                />
              </div>
            );
          })}
        </div>
      )}
      {occurrence ? (
        <EvaluationReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          groupId={groupId}
          group={detail.group}
          students={students}
          occurrence={occurrence}
        />
      ) : null}
    </div>
  );
}

function ChoiceButton({
  active,
  activeClassName,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  activeClassName: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`h-9 rounded-xl border px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? activeClassName
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function RatingPicker({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number | null;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            type="button"
            aria-label={`${label} ${score} من 5`}
            aria-pressed={value === score}
            disabled={disabled}
            onClick={() => onChange(value === score ? null : score)}
            className={`h-8 w-8 rounded-lg border text-xs font-bold tabular-nums transition disabled:cursor-not-allowed disabled:opacity-60 ${
              value === score
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}
