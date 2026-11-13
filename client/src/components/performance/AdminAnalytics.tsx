import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  StudentPerformancePanel,
  StudentPerformanceTable,
} from "@/components/performance/PerformanceWidgets";
import type { PerformanceStudentRow } from "@shared/performance";

const PAGE_SIZE = 25;

const RANGE_OPTIONS = [
  { value: "30", label: "آخر 30 يومًا" },
  { value: "90", label: "آخر 3 أشهر" },
  { value: "180", label: "آخر 6 أشهر" },
  { value: "365", label: "آخر 12 شهرًا" },
];

/**
 * The academy-wide performance tab, reduced to the same two cards and one
 * chart shown everywhere else. The admin can search any student, narrow by
 * group and period, and open that student's own scoped report.
 */
export default function AdminAnalytics() {
  const [days, setDays] = useState("180");
  const [groupId, setGroupId] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drillStudent, setDrillStudent] =
    useState<PerformanceStudentRow | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const range = useMemo(() => {
    const to = new Date();
    return {
      from: toDateKey(addDays(to, -Number(days))),
      to: toDateKey(to),
    };
  }, [days]);

  const analytics = trpc.admin.analytics.useQuery(
    {
      from: range.from,
      to: range.to,
      groupId: groupId === "all" ? undefined : Number(groupId),
      search: search || undefined,
      page: page + 1,
      pageSize: PAGE_SIZE,
    },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );

  const drilldown = trpc.admin.studentPerformance.useQuery(
    {
      studentId: drillStudent?.studentId ?? 0,
      groupId: drillStudent?.groupId ?? undefined,
      from: range.from,
      to: range.to,
      limit: 1,
      offset: 0,
    },
    { retry: false, enabled: drillStudent !== null },
  );

  const data = analytics.data;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.studentsTotal / PAGE_SIZE))
    : 1;
  const currentPage = data ? Math.min(page, totalPages - 1) : 0;
  const emptyLabel = search
    ? `لا يوجد طالب مطابق للبحث «${search}» داخل هذه الفلاتر.`
    : "لا يوجد طلاب مطابقون للفلاتر الحالية.";

  return (
    <div dir="rtl" lang="ar" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <BarChart3 className="h-4 w-4" />
            أداء الطلاب
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            متابعة الحضور والواجب والتفاعل
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">
            ابحث عن أي طالب، وحدّد المجموعة والفترة. كل طالب يعرض بطاقتي الحضور
            والواجب ورسمًا واحدًا للتفاعل والتركيز.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={() => analytics.refetch()}
          disabled={analytics.isFetching}
        >
          <RefreshCw
            className={`me-2 h-4 w-4 ${
              analytics.isFetching ? "animate-spin" : ""
            }`}
          />
          تحديث
        </Button>
      </div>

      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Filter className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">البحث والفلاتر</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-[13px] font-semibold leading-6 sm:col-span-2">
            <span>اسم الطالب</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="ابحث عن طالب بالاسم…"
                className="h-11 w-full rounded-xl border border-input bg-background ps-9 pe-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </span>
          </label>

          <label className="space-y-2 text-[13px] font-semibold leading-6">
            <span>المجموعة</span>
            <Select
              value={groupId}
              onValueChange={value => {
                setGroupId(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المجموعات</SelectItem>
                {(data?.filters.groups ?? []).map(group => (
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
                setPage(0);
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

          <div className="flex items-end pt-1 sm:col-span-2 lg:col-span-4">
            <Button
              variant="ghost"
              className="h-11 rounded-xl px-4"
              onClick={() => {
                setDays("180");
                setGroupId("all");
                setSearchInput("");
                setSearch("");
                setPage(0);
              }}
            >
              <X className="me-2 h-4 w-4" />
              إعادة ضبط البحث والفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {analytics.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          جارٍ تحميل أداء الطلاب…
        </div>
      ) : analytics.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm leading-7 text-destructive">
          تعذّر تحميل البيانات. تحقق من اتصالك ثم أعد المحاولة.
        </div>
      ) : data ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">الطلاب</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.studentsTotal} طالبًا مطابقًا · الفترة{" "}
                <span className="admin-ltr">{data.range.from}</span> ←{" "}
                <span className="admin-ltr">{data.range.to}</span>
              </p>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2 text-xs">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={currentPage === 0}
                  onClick={() => setPage(value => Math.max(0, value - 1))}
                  aria-label="الصفحة السابقة"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="tabular-nums text-muted-foreground">
                  {currentPage + 1} من {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() =>
                    setPage(value => Math.min(totalPages - 1, value + 1))
                  }
                  aria-label="الصفحة التالية"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <StudentPerformanceTable
            rows={data.students}
            onSelect={row => setDrillStudent(row)}
            selectedStudentId={drillStudent?.studentId}
            emptyLabel={emptyLabel}
          />
        </section>
      ) : null}

      <Dialog
        open={drillStudent !== null}
        onOpenChange={open => {
          if (!open) setDrillStudent(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[92vh] w-[min(1100px,95vw)] max-w-6xl overflow-y-auto p-6 sm:max-h-none sm:max-w-6xl sm:overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>
              {drilldown.data?.student.name ??
                drillStudent?.name ??
                "أداء الطالب"}
            </DialogTitle>
            <DialogDescription>
              {drilldown.data?.student.groupName ??
                drillStudent?.groupName ??
                "بدون مجموعة"}{" "}
              · الحضور والواجب محسوبان من الحصص والسجلات داخل الفترة المحددة.
            </DialogDescription>
          </DialogHeader>

          {drilldown.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              جارٍ تحميل تقييمات الطالب…
            </p>
          ) : drilldown.isError ? (
            <p className="py-10 text-center text-sm text-destructive">
              تعذّر تحميل تقييمات الطالب.
            </p>
          ) : drilldown.data ? (
            <div className="space-y-3">
              <StudentPerformancePanel
                summary={drilldown.data.summary}
                sessions={drilldown.data.sessions}
                compact
              />
              {drilldown.data.progress ? (
                <div className="rounded-2xl border border-border bg-card p-4 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                      {drilldown.data.progress.completed} درس مكتمل
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
                      {drilldown.data.progress.bestQuizzes.length} اختبار محفوظ
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
                      {drilldown.data.progress.bestQuizzes.reduce((sum, quiz) => sum + quiz.score, 0)} نقطة اختبارات
                    </span>
                  </div>
                  {drilldown.data.progress.bestQuizzes.length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      {drilldown.data.progress.bestQuizzes.slice(0, 10).map(quiz => (
                        <div key={`${quiz.course}:${quiz.lessonId}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5">
                          <span>{quiz.course} · {quiz.lessonId}</span>
                          <span className="tabular-nums">{quiz.score}/{quiz.total}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
