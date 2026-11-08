import { Link } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  CalendarX2,
  Clock,
  GraduationCap,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import {
  arabicTimeRange,
  arabicWeekday,
  CourseChips,
  EmptyBlock,
  LoadingBlock,
  StatCard,
  type InstructorGroupRow,
  type InstructorProfile,
} from "./shared";

export default function InstructorGroups({ profile }: { profile: InstructorProfile }) {
  const groups = trpc.instructor.groups.useQuery(undefined, {
    retry: false,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });

  const rows = (groups.data ?? []) as InstructorGroupRow[];
  const totalStudents = rows.reduce((sum, group) => sum + group.studentCount, 0);
  const totalSessions = rows.reduce((sum, group) => sum + group.sessions.length, 0);
  const firstName = profile.name.split(" ")[0] || profile.name;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <GraduationCap className="h-4 w-4" />
            بوابة المدرّب
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            أهلاً {firstName}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            دي مجموعاتك المسندة لك من جدول المواعيد. افتح أي مجموعة لتسجيل حضور
            الطلاب وتقييمهم لكل حصة.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          الدخول بحساب <b className="text-foreground">{profile.email}</b>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="مجموعاتي" value={String(rows.length)} icon={Users} />
        <StatCard label="طلابي" value={String(totalStudents)} icon={GraduationCap} />
        <StatCard
          label="حصص أسبوعية"
          value={String(totalSessions)}
          icon={CalendarDays}
        />
      </div>

      {groups.isLoading ? (
        <LoadingBlock label="جارٍ تحميل مجموعاتك…" />
      ) : groups.isError ? (
        <EmptyBlock
          icon={CalendarX2}
          title="تعذّر تحميل المجموعات"
          description="في مشكلة في الاتصال بالسيرفر. جرّب تحديث الصفحة أو أعد المحاولة بعد لحظات."
          action={
            <Button variant="outline" className="rounded-2xl" onClick={() => groups.refetch()}>
              إعادة المحاولة
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={CalendarX2}
          title="لا توجد مجموعات مسندة ليك لسه"
          description="الإدارة بتسند المدرّب من صفحة المواعيد في لوحة التحكم: افتح الحصة واختار اسمك من قائمة المدرّب. أول ما يتم الإسناد هتظهر المجموعة هنا تلقائيًا."
          action={
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              العودة لموقع الأكاديمية
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(group => (
            <Link key={group.id} href={`/instructor/group/${group.id}`}>
              <div className="group flex h-full flex-col rounded-[1.75rem] border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">{group.name}</h2>
                    {group.level ? (
                      <p className="mt-1 text-sm text-muted-foreground">{group.level}</p>
                    ) : null}
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {group.studentCount} طالب
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {group.sessions.length} حصة/أسبوع
                  </span>
                </div>

                <div className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
                  {group.sessions.length === 0 ? (
                    <p className="text-muted-foreground">لا توجد حصص مسجّلة لهذه المجموعة.</p>
                  ) : (
                    group.sessions.map(session => (
                      <div
                        key={session.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {arabicWeekday(session.dayOfWeek)}
                        </span>
                        <span>{arabicTimeRange(session.startTime, session.endTime)}</span>
                        {session.location ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex-1">
                  <CourseChips courses={group.courses} />
                </div>

                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  فتح المجموعة والتقييم
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
