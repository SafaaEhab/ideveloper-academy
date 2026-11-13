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
    <Card className="admin-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-5 w-5 text-primary" />
          حالة الكورسات على الموقع
        </CardTitle>
        <p className="text-sm leading-7 text-muted-foreground">
          هذه الحالة تحدد ما يظهر في بطاقات الموقع العام. «متاح للحجز» يفتح
          التواصل، و«قريباً» و«قائمة انتظار» يعرضان الانضمام لقائمة الانتظار.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {(offerings.data ?? []).map(offering => (
          <div key={offering.id} className="admin-card-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-extrabold">
                {COURSE_LABELS[offering.course] ?? offering.course}
              </span>
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
                  className="h-11 rounded-xl"
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
