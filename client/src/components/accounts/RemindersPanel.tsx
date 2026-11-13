import { useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  money,
  paymentMethodLabel,
  reminderKindLabel,
  reminderStatusLabel,
  statusTone,
} from "@/lib/phase2";

export default function RemindersPanel() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("all");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [cancelReason, setCancelReason] = useState("إيقاف يدوي من شاشة التذكيرات");
  const activeSubs = trpc.finance.subscriptions.list.useQuery(
    { status: "active", pageSize: 100 },
    { retry: false },
  );
  const list = trpc.finance.reminders.list.useQuery(
    {
      status: status === "all" ? undefined : (status as never),
      pageSize: 50,
    },
    { retry: false, refetchInterval: 30_000 },
  );
  const send = trpc.finance.reminders.sendNow.useMutation({
    onSuccess: result => {
      if (result.status === "sent") toast.success("تم إرسال التذكير");
      else if (result.status === "pending")
        toast.warning("تمت إعادة المحاولة لاحقاً: " + (result.error ?? ""));
      else toast.error(result.error ?? "لم يتم إرسال التذكير");
      utils.finance.reminders.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const cancel = trpc.finance.reminders.cancel.useMutation({
    onSuccess: result => {
      toast.success(`تم إلغاء ${result.cancelled} تذكيراً`);
      utils.finance.reminders.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const selected = activeSubs.data?.items.find(
    row => row.id === Number(subscriptionId),
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold">تذكيرات الدفع</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          تذكيرات معاملاتية مرتبطة بالاشتراك. تتوقف فوراً عند السداد الكامل أو
          إيقاف التذكيرات، وتُحترم حالة إيقاف رسائل واتساب. لا تُرسل تذكيرات
          تسويقية لمن أوقف الرسائل.
        </p>
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="pb-3"><CardTitle className="text-base">إرسال تذكير يدوي فوري</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="mb-2 block text-xs">الاشتراك</Label>
            <Select value={subscriptionId} onValueChange={setSubscriptionId}>
              <SelectTrigger><SelectValue placeholder="اختر اشتراكاً نشطاً" /></SelectTrigger>
              <SelectContent>
                {(activeSubs.data?.items ?? []).map(row => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.studentName} · {row.course} · متبقي {money(row.balance.remainingMinor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected ? (
            <div className="rounded-xl bg-muted/40 p-3 text-xs">
              طريقة الدفع: {paymentMethodLabel(selected.paymentMethod)} · الحالة:{" "}
              {selected.paymentStatusLabel} · المتبقي: {money(selected.balance.remainingMinor)}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button className="gap-1" disabled={!selected || send.isPending} onClick={() => selected ? send.mutate({ subscriptionId: selected.id }) : null}>
              <Bell className="h-4 w-4" />
              {send.isPending ? "جاري المحاولة…" : "إرسال الآن عبر WhatsApp"}
            </Button>
            <Button variant="outline" className="gap-1" disabled={!selected || cancel.isPending} onClick={() => selected ? cancel.mutate({ subscriptionId: selected.id, reason: cancelReason }) : null}>
              <BellOff className="h-4 w-4" />
              إلغاء التذكيرات المعلقة
            </Button>
          </div>
          <Input value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="سبب إلغاء التذكيرات" />
          <p className="text-xs leading-6 text-muted-foreground">
            الإرسال الفعلي يحتاج WhatsApp مهيأ وقالب Meta معتمداً. إذا لم يتوفر
            ذلك، سيظهر خطأ عربي واضح ويُسجل كفشل — لا يتم ادعاء النجاح.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardContent className="space-y-3 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">الحالة</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {["pending", "sent", "failed", "cancelled", "skipped", "sending"].map(value => (
                    <SelectItem key={value} value={value}>{reminderStatusLabel(value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => list.refetch()}>
              <RefreshCw className={list.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              تحديث
            </Button>
          </div>

          {list.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/50" />)}</div>
          ) : !list.data?.items.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">لا توجد تذكيرات مطابقة.</div>
          ) : (
            <div className="overflow-auto rounded-2xl border">
              <Table className="min-w-[1000px]">
                <TableHeader><TableRow><TableHead className="text-start">الطالب</TableHead><TableHead className="text-start">الكورس</TableHead><TableHead className="text-start">النوع</TableHead><TableHead className="text-start">الموعد</TableHead><TableHead className="text-start">الحالة</TableHead><TableHead className="text-start">المحاولات</TableHead><TableHead className="text-start">قالب / معرّف</TableHead><TableHead className="text-start">الخطأ</TableHead></TableRow></TableHeader>
                <TableBody>
                  {list.data.items.map(reminder => (
                    <TableRow key={reminder.id}>
                      <TableCell className="text-start text-sm">{reminder.studentName}</TableCell>
                      <TableCell className="text-xs">{reminder.course}</TableCell>
                      <TableCell className="text-xs">{reminderKindLabel(reminder.kind)}</TableCell>
                      <TableCell className="text-xs">{new Date(reminder.scheduledFor).toLocaleString("ar-EG")}</TableCell>
                      <TableCell><Badge className={statusTone(reminder.status)}>{reminderStatusLabel(reminder.status)}</Badge></TableCell>
                      <TableCell className="text-xs">{reminder.attempts}</TableCell>
                      <TableCell dir="ltr" className="text-start text-[10px]">{reminder.templateName || "—"} / {reminder.providerMessageId || "—"}</TableCell>
                      <TableCell className="text-start text-xs text-rose-600 dark:text-rose-300">{reminder.error || reminder.cancellationReason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
