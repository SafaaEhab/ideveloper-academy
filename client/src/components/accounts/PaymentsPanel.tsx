import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Plus, RotateCcw, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  downloadBase64File,
  money,
  paymentMethodLabel,
  statusTone,
  todayDateKey,
} from "@/lib/phase2";
import RecordPaymentDialog from "./RecordPaymentDialog";

export default function PaymentsPanel() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [method, setMethod] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [page, setPage] = useState(1);
  const [subscriptionId, setSubscriptionId] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [reversalId, setReversalId] = useState<number | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const employees = trpc.finance.employees.useQuery(undefined, { retry: false });
  const activeSubs = trpc.finance.subscriptions.list.useQuery(
    { status: "active", pageSize: 100 },
    { retry: false },
  );
  const history = trpc.finance.payments.history.useQuery(
    {
      fromKey: fromKey || undefined,
      toKey: toKey || undefined,
      method: method === "all" ? undefined : (method as never),
      recordedByUserId: employeeId === "all" ? undefined : Number(employeeId),
      page,
      pageSize: 20,
      includeReversals: true,
    },
    { retry: false },
  );
  const reverse = trpc.finance.payments.reverse.useMutation({
    onSuccess: result => {
      toast.success(`تم إنشاء قيد عكسي ${result.reversal.receiptNumber}`);
      setReversalId(null);
      setReversalReason("");
      utils.finance.payments.history.invalidate();
      utils.finance.subscriptions.list.invalidate();
      utils.finance.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => setPage(1), [fromKey, toKey, method, employeeId]);

  const selectedSub = activeSubs.data?.items.find(
    row => row.id === Number(subscriptionId),
  );

  const download = async (paymentId: number) => {
    try {
      const file = await utils.finance.payments.receiptPdf.fetch({ paymentId });
      downloadBase64File(file.fileName, file.base64, "application/pdf");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تنزيل الإيصال");
    }
  };

  const totalPages = Math.max(1, Math.ceil((history.data?.total ?? 0) / 20));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold">المدفوعات والإيصالات</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          كل دفعة قيد دائم. التصحيح بقيد عكسي فقط، مع سبب وموظف، دون حذف
          الأصل.
        </p>
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">تسجيل دفعة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="mb-2 block text-xs">الاشتراك</Label>
            <Select value={subscriptionId} onValueChange={setSubscriptionId}>
              <SelectTrigger aria-label="اشتراك الدفع">
                <SelectValue placeholder="اختر اشتراكاً نشطاً" />
              </SelectTrigger>
              <SelectContent>
                {(activeSubs.data?.items ?? []).map(row => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.studentName} · {row.course} · متبقي{" "}
                    {money(row.balance.remainingMinor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="gap-2"
            disabled={!selectedSub}
            onClick={() => setPayOpen(true)}
          >
            <Plus className="h-4 w-4" />
            فتح نموذج الدفع
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="mb-1.5 block text-xs">من تاريخ</Label>
              <Input type="date" value={fromKey} onChange={event => setFromKey(event.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">إلى تاريخ</Label>
              <Input type="date" value={toKey} onChange={event => setToKey(event.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">طريقة الدفع</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {["cash", "instapay", "wallet", "bank_transfer"].map(value => <SelectItem key={value} value={value}>{paymentMethodLabel(value)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">الموظف</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {(employees.data ?? []).map(employee => <SelectItem key={employee.userId} value={String(employee.userId)}>{employee.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {history.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/50" />)}</div>
          ) : !history.data?.items.length ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">لا توجد دفعات مطابقة.</div>
          ) : (
            <div className="overflow-auto rounded-2xl border">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">الإيصال</TableHead>
                    <TableHead className="text-start">الطالب</TableHead>
                    <TableHead className="text-start">الكورس</TableHead>
                    <TableHead className="text-start">المبلغ</TableHead>
                    <TableHead className="text-start">الطريقة</TableHead>
                    <TableHead className="text-start">التاريخ</TableHead>
                    <TableHead className="text-start">الموظف</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">ملف</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.items.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell dir="ltr" className="text-xs">{payment.receiptNumber}</TableCell>
                      <TableCell className="text-start text-sm">{payment.studentName}</TableCell>
                      <TableCell className="text-xs">{payment.course}</TableCell>
                      <TableCell className="text-sm font-semibold">{money(payment.amountMinor)}</TableCell>
                      <TableCell className="text-xs">{paymentMethodLabel(payment.method)}</TableCell>
                      <TableCell className="text-xs">{new Date(payment.paymentDate).toLocaleString("ar-EG")}</TableCell>
                      <TableCell className="text-xs">{payment.recorderName || "—"}</TableCell>
                      <TableCell>
                        <Badge className={statusTone(payment.status)}>
                          {payment.type === "reversal" ? "قيد عكسي" : payment.status === "reversed" ? "ملغاة" : "مسجلة"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{payment.hasReceiptImage ? "مرفق" : "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => download(payment.id)}>
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                          {isAdmin && payment.type === "payment" && payment.status === "posted" ? (
                            <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => { setReversalId(payment.id); setReversalReason(""); }}>
                              <RotateCcw className="h-3.5 w-3.5" /> عكس
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span>صفحة {page} من {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>السابق</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>التالي</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {payOpen && selectedSub ? (
        <RecordPaymentDialog
          open={payOpen}
          onOpenChange={open => setPayOpen(open)}
          subscriptionId={selectedSub.id}
          studentName={selectedSub.studentName}
          course={selectedSub.course}
          remainingMinor={selectedSub.balance.remainingMinor}
          onRecorded={() => {
            utils.finance.payments.history.invalidate();
            utils.finance.subscriptions.list.invalidate();
            utils.finance.dashboard.invalidate();
          }}
        />
      ) : null}

      <Dialog open={Boolean(reversalId)} onOpenChange={open => !open && setReversalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قيد عكسي للدفعة</DialogTitle>
            <DialogDescription>
              لن تُحذف الدفعة الأصلية. سيُسجل قيد عكسي جديد ويُعاد حساب الرصيد
              والحالة، ويُحفظ الموظف والسبب.
            </DialogDescription>
          </DialogHeader>
          <Input value={reversalReason} onChange={event => setReversalReason(event.target.value)} placeholder="سبب العكس (5 أحرف على الأقل)" />
          <Button variant="destructive" disabled={reversalReason.trim().length < 5 || reverse.isPending} onClick={() => reversalId ? reverse.mutate({ paymentId: reversalId, reason: reversalReason }) : null}>
            {reverse.isPending ? "جاري تسجيل القيد العكسي…" : "تأكيد القيد العكسي"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
