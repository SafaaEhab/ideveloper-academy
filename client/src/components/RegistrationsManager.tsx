import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  contacted: "Contacted",
  approved: "Approved",
  rejected: "Rejected",
};

export default function RegistrationsManager() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("pending");
  const requests = trpc.admin.registrationRequests.useQuery(
    { status: statusFilter === "all" ? undefined : (statusFilter as "pending" | "contacted" | "approved" | "rejected") },
    { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );
  const waiting = trpc.admin.waitingList.useQuery(undefined, {
    retry: false,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const updateStatus = trpc.admin.updateRegistrationStatus.useMutation({
    onSuccess: () => {
      toast.success("Request updated");
      utils.admin.registrationRequests.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const approve = trpc.admin.approveRegistration.useMutation({
    onSuccess: data => {
      toast.success(`Student created — access code: ${data.accessCode}`);
      utils.admin.registrationRequests.invalidate();
      utils.admin.students.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateWaiting = trpc.admin.updateWaitingListStatus.useMutation({
    onSuccess: () => {
      toast.success("Waiting-list request updated");
      utils.admin.waitingList.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const rows = requests.data ?? [];

  return (
    <div className="space-y-5">
      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Registration requests</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Every public registration is stored here, whether or not the parent also sent WhatsApp.
            </p>
          </div>
          <div className="w-44">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl" aria-label="Filter registration status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {requests.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading requests…</p>
          ) : requests.isError ? (
            <p className="text-sm text-destructive">Could not load registration requests.</p>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No registration requests in this view.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map(request => (
                <div key={request.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{request.fullName}</span>
                        <Badge variant={request.status === "pending" ? "default" : "secondary"}>
                          {STATUS_LABEL[request.status] ?? request.status}
                        </Badge>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {request.course}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <span dir="ltr">Student phone: {request.phone}</span>
                        <span dir="ltr">Parent: {request.parentPhone}</span>
                        <span dir="ltr">Email: {request.parentEmail}</span>
                        <span>Age: {request.age}</span>
                        <span>School: {request.school}</span>
                        <span>Submitted: {new Date(request.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{request.address}</p>
                      {request.notes ? (
                        <p className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">{request.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {request.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="rounded-xl"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate({ id: request.id })}
                          >
                            Approve &amp; create student
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: request.id, status: "contacted" })}
                          >
                            Mark contacted
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-destructive"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: request.id, status: "rejected" })}
                          >
                            Reject
                          </Button>
                        </>
                      ) : request.status === "approved" && request.studentId ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Student #{request.studentId}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: request.id, status: "pending" })}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Course waiting list</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests submitted from “Coming soon” or “Waiting list” course cards.
          </p>
        </CardHeader>
        <CardContent>
          {waiting.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading waiting list…</p>
          ) : (waiting.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No waiting-list requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {(waiting.data ?? []).map(entry => (
                <div key={entry.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{entry.name}</span>
                      <Badge variant="secondary">{entry.course}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <span dir="ltr">{entry.phone}</span>
                      {entry.email ? <span dir="ltr">{entry.email}</span> : null}
                    </div>
                    {entry.note ? <p className="mt-1 text-sm">{entry.note}</p> : null}
                  </div>
                  <div className="w-40 shrink-0">
                    <Select
                      value={entry.status}
                      onValueChange={value =>
                        updateWaiting.mutate({
                          id: entry.id,
                          status: value as "pending" | "contacted" | "enrolled",
                        })
                      }
                      disabled={updateWaiting.isPending}
                    >
                      <SelectTrigger className="h-10 rounded-xl" aria-label={`Status for ${entry.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
