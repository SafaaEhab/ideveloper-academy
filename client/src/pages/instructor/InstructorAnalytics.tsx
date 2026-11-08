import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Filter,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { addDays, toDateKey } from "@/lib/schedule";
import {
  EmptyBlock,
  LoadingBlock,
  type InstructorProfile,
} from "./shared";
import {
  StudentPerformancePanel,
  StudentPerformanceTable,
} from "@/components/performance/PerformanceWidgets";
import type { PerformanceStudentRow } from "@shared/performance";

const RANGE_OPTIONS = [
  { value: "30", label: "آخر 30 يومًا" },
  { value: "90", label: "آخر 3 أشهر" },
  { value: "180", label: "آخر 6 أشهر" },
  { value: "365", label: "آخر 12 شهرًا" },
];

/**
 * The instructor's compact performance workspace. The server scopes every row
 * to the groups whose timetable slots carry this instructor. Selecting a
 * student opens their attendance/homework cards and one interaction/focus
 * chart; no academy-wide comparisons are rendered here.
 */
export default function InstructorAnalytics({
  profile,
}: {
  profile: InstructorProfile;
}) {
  const [groupId, setGroupId] = useState("all");
  const [days, setDays] = useState("180");
  const [selected, setSelected] = useState<PerformanceStudentRow | null>(null);

  const range = useMemo(() => {
    const to = new Date();
    return {
      from: toDateKey(addDays(to, -Number(days))),
      to: toDateKey(to),
    };
  }, [days]);

  const analytics = trpc.instructor.analytics.useQuery(
    {
      from: range.from,
      to: range.to,
      groupId: groupId === "all" ? undefined : Number(groupId),
    },
    {
      retry: false,
      refetchInterval: LIVE_REFETCH_INTERVAL,
    },
  );

  const detail = trpc.instructor.studentPerformance.useQuery(
    {
      groupId: selected?.groupId ?? 0,
      studentId: selected?.studentId ?? 0,
      from: range.from,
      to: range.to,
      limit: 1,
      offset: 0,
    },
    {
      retry: false,
      enabled: selected?.groupId != null,
    },
  );

  const data = analytics.data;
  const hasGroups = (data?.filters.groups.length ?? 0) > 0;
  const firstName = profile.name.split(" ")[0] || profile.name;

  if (analytics.isLoading) {
    return <LoadingBlock label="جارٍ حساب أداء الطلاب…" />;
  }

  if (analytics.isError) {
    return (
      <EmptyBlock
        icon={BarChart3}
        title="تعذّر تحميل الأداء"
        description="حدث خطأ أثناء قراءة بيانات الأداء. حاول تحديث الصفحة، أو تواصل مع إدارة الأكاديمية إذا استمرت المشكلة."
        action={
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => analytics.refetch()}
          >
            <RefreshCw className="me-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <BarChart3 className="h-4 w-4" />
            أداء الطلاب
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            متابعة {firstName} لطلابه
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            الحضور محسوب من الحصص المستحقة في الجدول، والواجب من السجلات
            المطلوبة فعلًا. اختر طالبًا لعرض بطاقتيه ورسم التفاعل والتركيز.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={() => analytics.refetch()}
          disabled={analytics.isFetching}
        >
          <RefreshCw
            className={`me-2 h-4 w-4 ${analytics.isFetching ? "animate-spin" : ""}`}
          />
          تحديث
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Filter className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">الفلاتر</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2 text-[13px] font-semibold leading-6">
            <span>المجموعة</span>
            <Select
              value={groupId}
              onValueChange={value => {
                setGroupId(value);
                setSelected(null);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل مجموعاتي</SelectItem>
                {data?.filters.groups.map(group => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2 text-[13px] font-semibold leading-6">
            <span>الفترة</span>
            <Select
              value={days}
              onValueChange={value => {
                setDays(value);
                setSelected(null);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-end pt-1">
            <Button
              variant="ghost"
              className="h-11 w-full rounded-xl px-4"
              onClick={() => {
                setGroupId("all");
                setDays("180");
                setSelected(null);
              }}
            >
              إعادة ضبط الفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasGroups ? (
        <EmptyBlock
          icon={Users}
          title="لا توجد مجموعات مسندة إليك"
          description="تظهر المتابعة بعد أن تربط إدارة الأكاديمية جلسة واحدة على الأقل من الجدول بحسابك."
        />
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">طلاب المجموعات</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {data!.students.length} طالبًا في النطاق الحالي.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {data!.range.from} ← {data!.range.to}
            </span>
          </div>

          <StudentPerformanceTable
            rows={data!.students}
            selectedStudentId={selected?.studentId}
            onSelect={row => setSelected(row)}
          />

          {selected ? (
            <Card className="rounded-3xl">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base">
                    أداء {selected.name}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.groupName ?? "بدون مجموعة"} · الفترة{" "}
                    {data!.range.from} ← {data!.range.to}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setSelected(null)}
                  aria-label="إغلاق تفاصيل الطالب"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {detail.isLoading && selected.groupId != null ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    جارٍ تحميل تقييمات الطالب…
                  </p>
                ) : detail.isError && selected.groupId != null ? (
                  <p className="py-8 text-center text-xs text-destructive">
                    تعذّر تحميل تقييمات الطالب.
                  </p>
                ) : (
                  <StudentPerformancePanel
                    summary={detail.data?.summary ?? selected.summary}
                    sessions={detail.data?.sessions ?? []}
                  />
                )}
              </CardContent>
            </Card>
          ) : null}
        </section>
      )}
    </div>
  );
}
