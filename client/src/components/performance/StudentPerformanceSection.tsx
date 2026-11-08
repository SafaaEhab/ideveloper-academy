import { useMemo, useState } from "react";
import { Activity, CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { addDays, toDateKey } from "@/lib/schedule";
import { StudentPerformancePanel } from "@/components/performance/PerformanceWidgets";

const RANGE_OPTIONS = [
  { value: "30", label: "آخر 30 يومًا" },
  { value: "90", label: "آخر 3 أشهر" },
  { value: "180", label: "آخر 6 أشهر" },
  { value: "365", label: "آخر 12 شهرًا" },
];

/**
 * The student's own performance report. The query carries no student id: the
 * server reads it from the signed HttpOnly cookie, so changing a filter can
 * never point the report at somebody else. Only the student's own attendance,
 * homework and interaction/focus chart are rendered here.
 */
export default function StudentPerformanceSection() {
  const [days, setDays] = useState("180");

  const range = useMemo(() => {
    const to = new Date();
    return {
      from: toDateKey(addDays(to, -Number(days))),
      to: toDateKey(to),
    };
  }, [days]);

  const performance = trpc.portal.performance.useQuery(
    {
      from: range.from,
      to: range.to,
      limit: 1,
      offset: 0,
    },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );

  if (performance.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        جارٍ تحميل أدائك…
      </div>
    );
  }

  if (performance.isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm leading-7 text-destructive">
        تعذّر تحميل أدائك الآن. حدّث الصفحة وحاول مرة أخرى، وإذا استمرت
        المشكلة تواصل مع الأكاديمية.
      </div>
    );
  }

  const data = performance.data;
  if (!data) return null;

  return (
    <div dir="rtl" lang="ar" className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Activity className="h-5 w-5 text-primary" />
            أدائي
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            عدد الحصص التي حضرتها من إجمالي الحصص المستحقة، وعدد الواجبات التي
            سلّمتها من إجمالي الواجبات المطلوبة، مع تطور التفاعل والتركيز.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select
              value={days}
              onValueChange={value => setDays(value)}
            >
              <SelectTrigger className="h-10 w-[11rem] rounded-xl">
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
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => performance.refetch()}
            disabled={performance.isFetching}
            aria-label="تحديث البيانات"
          >
            <RefreshCw
              className={`h-4 w-4 ${performance.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <StudentPerformancePanel
        summary={data.summary}
        sessions={data.sessions}
        title="ملخص الفترة"
        description={`${data.range.from} ← ${data.range.to} · الحقول غير المسجلة تظهر كفجوة، ولا تُحسب كصفر.`}
      />

      {data.progress ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-base font-bold">الدروس والاختبارات المحفوظة</h3>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            هذا السجل محفوظ على الخادم، ويفضل موجودًا بعد تحديث الصفحة أو تغيير الجهاز.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              {data.progress.completed} درس مكتمل
            </span>
            <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
              {data.progress.totalTracked} درس مسجّل
            </span>
          </div>
          {data.progress.bestQuizzes.length > 0 ? (
            <div className="mt-4 space-y-2">
              {data.progress.bestQuizzes.slice(0, 12).map(quiz => (
                <div key={`${quiz.course}:${quiz.lessonId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-semibold">{quiz.course} · {quiz.lessonId}</span>
                  <span className="tabular-nums">{quiz.score} / {quiz.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">لا توجد نتائج اختبارات محفوظة بعد.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
