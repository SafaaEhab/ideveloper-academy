import { Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import type { CourseOfferingStatus } from "@shared/courseAvailability";

const COURSE_LABELS: Record<string, string> = {
  Scratch: "سكراتش",
  Robotics: "الروبوتات",
  Web: "تطوير الويب",
  Python: "بايثون",
};

const STATUS_LABELS: Record<CourseOfferingStatus, string> = {
  live: "متاح للحجز",
  coming_soon: "قريباً",
  waiting_list: "قائمة انتظار",
};

export default function CoursesManager() {
  const utils = trpc.useUtils();
  const offerings = trpc.admin.courseOfferings.useQuery(undefined, {
    retry: false,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const update = trpc.admin.updateCourseStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الكورس");
      utils.admin.courseOfferings.invalidate();
      utils.site.courses.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Card className="admin-panel">
      <CardHeader className="admin-panel-head">
        <div>
          <span className="admin-kicker">Course catalog</span>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-primary" />
            حالة الكورسات على الموقع
          </CardTitle>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-muted-foreground">
            هذه الحالة تحدد ما يظهر في بطاقات الموقع العام. «متاح للحجز» يفتح
            التواصل، و«قريباً» و«قائمة انتظار» يعرضان الانضمام لقائمة الانتظار.
          </p>
        </div>
        <Badge variant="outline">{offerings.data?.length ?? 0} كورسات</Badge>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {(offerings.data ?? []).map(offering => (
          <div
            key={offering.id}
            className={`admin-catalog-card admin-catalog-${offering.course.toLowerCase()}`}
          >
            <div className="admin-catalog-top">
              <span className="admin-catalog-mark">
                <Layers />
              </span>
              <div className="min-w-0 flex-1">
                <div className="admin-catalog-name">
                  {COURSE_LABELS[offering.course] ?? offering.course}
                </div>
                <div className="admin-catalog-en">{offering.course}</div>
              </div>
              <Badge
                variant={offering.status === "live" ? "default" : "secondary"}
                className="rounded-full"
              >
                {STATUS_LABELS[offering.status]}
              </Badge>
            </div>
            <div className="mt-4">
              <Select
                value={offering.status}
                onValueChange={value =>
                  update.mutate({
                    course: offering.course,
                    status: value as CourseOfferingStatus,
                  })
                }
                disabled={update.isPending}
              >
                <SelectTrigger
                  className="h-11 w-full"
                  aria-label={`حالة كورس ${COURSE_LABELS[offering.course] ?? offering.course}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">متاح للحجز</SelectItem>
                  <SelectItem value="coming_soon">قريباً</SelectItem>
                  <SelectItem value="waiting_list">قائمة انتظار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {offerings.isLoading ? (
          <p className="text-sm text-muted-foreground">جارٍ تحميل الكورسات…</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
