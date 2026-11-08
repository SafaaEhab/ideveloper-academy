import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { COURSE_STATUS_LABELS, type CourseOfferingStatus } from "@shared/courseAvailability";

/**
 * Admin control for the one status that both the workspace overview and the
 * public course cards read. There is no second copy of this value in the UI.
 */
export default function CoursesManager() {
  const utils = trpc.useUtils();
  const offerings = trpc.admin.courseOfferings.useQuery(undefined, {
    retry: false,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const update = trpc.admin.updateCourseStatus.useMutation({
    onSuccess: () => {
      toast.success("Course availability updated");
      utils.admin.courseOfferings.invalidate();
      utils.site.courses.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Course availability</CardTitle>
        <p className="text-sm text-muted-foreground">
          This status drives the public course cards. “Coming soon” and “Waiting list” show
          “Join waiting list” instead of an active booking button.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {(offerings.data ?? []).map(offering => (
          <div key={offering.id} className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold">{offering.course}</span>
              <Badge variant={offering.status === "live" ? "default" : "secondary"}>
                {COURSE_STATUS_LABELS[offering.status]}
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
                <SelectTrigger className="h-11 rounded-xl" aria-label={`Status for ${offering.course}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="coming_soon">Coming soon</SelectItem>
                  <SelectItem value="waiting_list">Waiting list</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {offerings.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading courses…</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
