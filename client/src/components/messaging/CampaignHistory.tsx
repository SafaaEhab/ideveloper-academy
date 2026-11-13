import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Eye, RefreshCw, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { campaignProgress } from "@shared/messaging";
import {
  campaignStatusLabel,
  recipientStatusLabel,
  statusTone,
} from "@/lib/phase2";

function StatusBadge({ status }: { status: string }) {
  return <Badge className={statusTone(status)}>{campaignStatusLabel(status)}</Badge>;
}

export default function CampaignHistory({ scheduledOnly = false }: { scheduledOnly?: boolean }) {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("ألغاها الأدمن قبل التنفيذ");
  const list = trpc.messaging.campaigns.list.useQuery(
    {
      status: scheduledOnly ? "scheduled" : undefined,
      page,
      pageSize: 20,
    },
    { retry: false, refetchInterval: 10_000 },
  );
  const detail = trpc.messaging.campaigns.detail.useQuery(
    { id: detailId ?? 0 },
    { enabled: Boolean(detailId), retry: false, refetchInterval: 10_000 },
  );
  const cancel = trpc.messaging.campaigns.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الحملة");
      setCancelId(null);
      utils.messaging.campaigns.list.invalidate();
      utils.messaging.campaigns.detail.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const retry = trpc.messaging.campaigns.retryFailed.useMutation({
    onSuccess: result => {
      toast.success(`أُعيدت ${result.retried} رسالة إلى قائمة الانتظار`);
      utils.messaging.campaigns.list.invalidate();
      utils.messaging.campaigns.detail.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const runNow = trpc.messaging.campaigns.runNow.useMutation({
    onSuccess: result => {
      toast.success(
        `معالجة الآن: ${result.sent} ناجحة، ${result.failed} فاشلة، ${result.remaining} متبقية`,
      );
      utils.messaging.campaigns.list.invalidate();
      utils.messaging.campaigns.detail.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const totalPages = Math.max(
    1,
    Math.ceil((list.data?.total ?? 0) / (list.data?.pageSize ?? 20)),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-xl font-bold">
            {scheduledOnly ? "الحملات المجدولة" : "سجل الحملات والرسائل"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {scheduledOnly
              ? "الحملات التي لم تنفذ بعد. يمكن إلغاؤها قبل موعدها."
              : "حالة كل حملة، تقدمها، معرّف رسالة المزود، سبب الفشل، وإعادة المحاولة."}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => list.refetch()}
        >
          <RefreshCw className={list.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          تحديث
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 p-4 md:p-5">
          {list.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
              ))}
            </div>
          ) : list.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
              تعذر تحميل الحملات: {list.error.message}
            </div>
          ) : !list.data?.items.length ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {scheduledOnly ? "لا توجد حملات مجدولة." : "لا توجد حملات بعد."}
            </div>
          ) : (
            <div className="space-y-3">
              {list.data.items.map(campaign => {
                const progress = campaignProgress({
                  sentCount: campaign.sentCount,
                  failedCount: campaign.failedCount,
                  totalRecipients: campaign.totalRecipients,
                });
                return (
                  <div
                    key={campaign.id}
                    className="rounded-2xl border border-border/70 p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{campaign.name}</span>
                          <StatusBadge status={campaign.status} />
                          <Badge variant="outline">
                            {campaign.audience === "leads" ? "عملاء" : "طلاب"}
                          </Badge>
                          <Badge variant="outline">
                            {campaign.messageType === "marketing" ? "تسويقية" : "معاملاتية"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          أنشأها {campaign.creatorName || "—"} ·{" "}
                          {new Date(campaign.createdAt).toLocaleString("ar-EG")}
                          {campaign.scheduledAt
                            ? ` · مجدولة ${new Date(campaign.scheduledAt).toLocaleString("ar-EG")}`
                            : ""}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                          <span>الإجمالي: {campaign.totalRecipients}</span>
                          <span>أُرسلت: {campaign.sentCount}</span>
                          <span>فشلت: {campaign.failedCount}</span>
                          <span>مستبعدة: {campaign.excludedCount}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setDetailId(campaign.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          التفاصيل
                        </Button>
                        {["scheduled", "queued", "sending"].includes(campaign.status) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-destructive"
                            onClick={() => {
                              setCancelId(campaign.id);
                              setCancelReason("ألغاها الأدمن قبل التنفيذ");
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            إلغاء
                          </Button>
                        ) : null}
                        {campaign.failedCount > 0 &&
                        !["cancelled"].includes(campaign.status) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            disabled={retry.isPending}
                            onClick={() => retry.mutate({ id: campaign.id })}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            إعادة الفاشل
                          </Button>
                        ) : null}
                        {campaign.status !== "scheduled" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            disabled={runNow.isPending}
                            onClick={() => runNow.mutate({ id: campaign.id })}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            معالجة الآن
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    </div>
                    {campaign.lastError ? (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                        {campaign.lastError}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <span>
              صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(value => Math.max(1, value - 1))}
              >
                السابق
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(cancelId)} onOpenChange={open => !open && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء الحملة</DialogTitle>
            <DialogDescription>
              لن تُرسل أي رسالة لم يبدأ إرسالها. اكتب سبب الإلغاء ليُسجل في
              سجل التدقيق.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="سبب إلغاء الحملة"
            value={cancelReason}
            onChange={event => setCancelReason(event.target.value)}
          />
          <Button
            variant="destructive"
            disabled={!cancelReason.trim() || cancel.isPending}
            onClick={() =>
              cancelId ? cancel.mutate({ id: cancelId, reason: cancelReason }) : null
            }
          >
            {cancel.isPending ? "جاري الإلغاء…" : "تأكيد الإلغاء"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detailId)}
        onOpenChange={open => !open && setDetailId(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{detail.data?.campaign.name ?? "تفاصيل الحملة"}</DialogTitle>
            <DialogDescription>
              {detail.data
                ? `${detail.data.campaign.totalRecipients} مستلماً · أُرسلت ${detail.data.campaign.sentCount} · فشلت ${detail.data.campaign.failedCount} · مستبعدة ${detail.data.campaign.excludedCount}`
                : "جاري التحميل…"}
            </DialogDescription>
          </DialogHeader>
          {detail.data ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                {detail.data.campaign.body}
              </div>
              <div className="max-h-[55vh] overflow-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">المستلم</TableHead>
                      <TableHead className="text-start">الهاتف</TableHead>
                      <TableHead className="text-start">الحالة</TableHead>
                      <TableHead className="text-start">معرّف المزود</TableHead>
                      <TableHead className="text-start">المحاولات</TableHead>
                      <TableHead className="text-start">السبب / الخطأ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.data.recipients.map(recipient => (
                      <TableRow key={recipient.id}>
                        <TableCell className="text-start">{recipient.name}</TableCell>
                        <TableCell dir="ltr" className="text-start">
                          {recipient.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusTone(recipient.status)}>
                            {recipientStatusLabel(recipient.status)}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="text-start text-xs">
                          {recipient.providerMessageId || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {recipient.attempts} / {recipient.retryCount}
                        </TableCell>
                        <TableCell className="text-start text-xs text-muted-foreground">
                          {recipient.error || recipient.exclusionReason || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
