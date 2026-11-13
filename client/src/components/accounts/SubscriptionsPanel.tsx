import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BellOff,
  Download,
  Eye,
  Plus,
  RefreshCw,
  RotateCcw,
  Wallet,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { parseAmountToMinor } from "@shared/money";
import {
  downloadBase64File,
  invoiceStatusLabel,
  money,
  paymentMethodLabel,
  reminderKindLabel,
  reminderStatusLabel,
  statusTone,
  subscriptionTypeLabel,
  todayDateKey,
} from "@/lib/phase2";
import RecordPaymentDialog from "./RecordPaymentDialog";

const COURSES = ["Scratch", "Robotics", "Web", "Python"] as const;

const emptyForm = {
  studentId: "",
  course: "Python",
  type: "monthly",
  baseAmount: "",
  siblingStudentId: "none",
  siblingPercent: "0",
  manualDiscount: "",
  discountReason: "",
  paymentMethod: "cash",
  startDateKey: todayDateKey(),
  dueDateKey: todayDateKey(),
  recurringDueDay: "",
  reminderEnabled: true,
  notes: "",
};

export default function SubscriptionsPanel() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const students = trpc.finance.students.useQuery(undefined, { retry: false });
  const plans = trpc.finance.coursePlans.list.useQuery(undefined, { retry: false });
  const list = trpc.finance.subscriptions.list.useQuery(
    {
      search: search.trim() || undefined,
      course: course === "all" ? undefined : (course as never),
      paymentStatus:
        paymentStatus === "all" ? undefined : (paymentStatus as never),
      status: status === "all" ? undefined : (status as never),
      page,
      pageSize: 20,
    },
    { retry: false },
  );
  const detail = trpc.finance.subscriptions.get.useQuery(
    { id: detailId ?? 0 },
    { enabled: Boolean(detailId), retry: false },
  );

  const create = trpc.finance.subscriptions.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الاشتراك وجدولة التذكيرات");
      setCreateOpen(false);
      setForm(emptyForm);
      utils.finance.subscriptions.list.invalidate();
      utils.finance.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const disableReminders = trpc.finance.subscriptions.update.useMutation({
    onSuccess: () => {
      toast.success("تم إيقاف تذكيرات هذا الاشتراك");
      utils.finance.subscriptions.list.invalidate();
      utils.finance.subscriptions.get.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const cancel = trpc.finance.subscriptions.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الاشتراك");
      setCancelId(null);
      utils.finance.subscriptions.list.invalidate();
      utils.finance.subscriptions.get.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const renew = trpc.finance.subscriptions.renew.useMutation({
    onSuccess: () => {
      toast.success("تم تجديد الاشتراك للفترة التالية");
      utils.finance.subscriptions.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => setPage(1), [search, course, paymentStatus, status]);

  const selectedStudent = students.data?.find(
    student => student.id === Number(form.studentId),
  );
  const plan = plans.data?.find(item => item.course === form.course);

  useEffect(() => {
    if (!selectedStudent) return;
    const firstCourse = selectedStudent.courses[0];
    if (firstCourse && !selectedStudent.courses.includes(form.course as never)) {
      setForm(current => ({ ...current, course: firstCourse }));
    }
  }, [selectedStudent]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestion = useMemo(() => {
    if (plan?.basePriceMinor && !form.baseAmount) {
      return (plan.basePriceMinor / 100).toFixed(2);
    }
    return form.baseAmount;
  }, [plan, form.baseAmount]);

  const submit = () => {
    const base = parseAmountToMinor(suggestion);
    if (!base.ok) {
      toast.error(base.error);
      return;
    }
    const manual = form.manualDiscount.trim()
      ? parseAmountToMinor(form.manualDiscount)
      : { ok: true as const, minor: 0 };
    if (!manual.ok) {
      toast.error(manual.error);
      return;
    }
    if (manual.minor > 0 && !form.discountReason.trim()) {
      toast.error("سبب الخصم اليدوي مطلوب");
      return;
    }
    create.mutate({
      studentId: Number(form.studentId),
      course: form.course as never,
      type: form.type as never,
      baseAmountMinor: base.minor,
      siblingStudentId:
        form.siblingStudentId === "none" ? null : Number(form.siblingStudentId),
      siblingDiscountPercent: Number(form.siblingPercent || 0),
      manualDiscountMinor: manual.minor,
      discountReason: form.discountReason.trim() || null,
      paymentMethod: form.paymentMethod as never,
      startDateKey: form.startDateKey,
      dueDateKey: form.dueDateKey,
      recurringDueDay: form.recurringDueDay ? Number(form.recurringDueDay) : null,
      reminderEnabled: form.reminderEnabled,
      notes: form.notes.trim() || null,
    });
  };

  const downloadReceipt = async (paymentId: number) => {
    try {
      const file = await utils.finance.payments.receiptPdf.fetch({ paymentId });
      downloadBase64File(file.fileName, file.base64, "application/pdf");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تنزيل الإيصال");
    }
  };

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 20));

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-xl font-bold">الاشتراكات</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            اشتراك شهري، كل شهرين، أو دفعة واحدة. الحالة تُحسب من الدفعات
            المسجلة فقط.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          اشتراك جديد
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative">
              <Label className="mb-1.5 block text-xs">بحث</Label>
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="اسم الطالب أو الهاتف"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">الكورس</Label>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الكورسات</SelectItem>
                  {COURSES.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">حالة الدفع</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="due">مستحق</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                  <SelectItem value="partially_paid">مدفوع جزئياً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">حالة الاشتراك</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {list.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />)}</div>
          ) : !list.data?.items.length ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">لا توجد اشتراكات مطابقة.</div>
          ) : (
            <div className="overflow-auto rounded-2xl border">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">الطالب</TableHead>
                    <TableHead className="text-start">الكورس</TableHead>
                    <TableHead className="text-start">النوع</TableHead>
                    <TableHead className="text-start">الإجمالي</TableHead>
                    <TableHead className="text-start">المدفوع</TableHead>
                    <TableHead className="text-start">المتبقي</TableHead>
                    <TableHead className="text-start">الاستحقاق</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.items.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="text-start font-medium">
                        {row.studentName}
                        <div className="text-[10px] text-muted-foreground">{row.groupName || "بدون مجموعة"}</div>
                      </TableCell>
                      <TableCell>{row.course}</TableCell>
                      <TableCell className="text-xs">{subscriptionTypeLabel(row.type)}</TableCell>
                      <TableCell className="text-xs">{money(row.finalAmountMinor)}</TableCell>
                      <TableCell className="text-xs">{money(row.balance.netPaidMinor)}</TableCell>
                      <TableCell className="text-xs font-semibold">{money(row.balance.remainingMinor)}</TableCell>
                      <TableCell className="text-xs" dir="ltr">{row.dueDateKey}</TableCell>
                      <TableCell>
                        <Badge className={statusTone(row.balance.status)}>
                          {invoiceStatusLabel(row.balance.status)}
                        </Badge>
                        {row.balance.overpaidMinor > 0 ? <div className="mt-1 text-[10px] text-emerald-600">دفع زائد {money(row.balance.overpaidMinor)}</div> : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setPaymentId(row.id)}>
                            <Wallet className="h-3.5 w-3.5" /> دفعة
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setDetailId(row.id)}>
                            <Eye className="h-3.5 w-3.5" /> تفاصيل
                          </Button>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>اشتراك جديد</DialogTitle>
            <DialogDescription>أسعار الكورسات تُدخل يدوياً أو تأتي من إعدادات الكورس. لا يوجد سعر مفترض.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block">الطالب</Label>
              <Select value={form.studentId || "none"} onValueChange={value => setForm({ ...form, studentId: value === "none" ? "" : value })}>
                <SelectTrigger aria-label="الطالب"><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">اختر الطالب</SelectItem>
                  {(students.data ?? []).map(student => (
                    <SelectItem key={student.id} value={String(student.id)}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">الكورس</Label>
              <Select value={form.course} onValueChange={value => setForm({ ...form, course: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURSES.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">نوع الاشتراك</Label>
              <Select value={form.type} onValueChange={value => setForm({ ...form, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">شهري</SelectItem>
                  <SelectItem value="two_months">كل شهرين</SelectItem>
                  <SelectItem value="one_time">دفعة واحدة للكورس</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">المبلغ الأساسي (جنيه)</Label>
              <Input aria-label="المبلغ الأساسي" value={suggestion} onChange={event => setForm({ ...form, baseAmount: event.target.value })} inputMode="decimal" dir="ltr" placeholder={plan?.basePriceMinor ? undefined : "غير مُكوّن"} />
              {plan?.basePriceMinor ? <p className="mt-1 text-[10px] text-muted-foreground">سعر الكورس المُكوّن: {money(plan.basePriceMinor)}</p> : <p className="mt-1 text-[10px] text-amber-600">لا يوجد سعر مُكوّن لهذا الكورس.</p>}
            </div>
            <div>
              <Label className="mb-2 block">طريقة الدفع</Label>
              <Select value={form.paymentMethod} onValueChange={value => setForm({ ...form, paymentMethod: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "instapay", "wallet", "bank_transfer"].map(value => <SelectItem key={value} value={value}>{paymentMethodLabel(value)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">الأخ/الأخت (اختياري)</Label>
              <Select value={form.siblingStudentId} onValueChange={value => setForm({ ...form, siblingStudentId: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">لا يوجد</SelectItem>
                  {(students.data ?? []).filter(student => String(student.id) !== form.studentId).map(student => (
                    <SelectItem key={student.id} value={String(student.id)}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">نسبة خصم الأخ (٪)</Label>
              <Input type="number" min={0} max={100} value={form.siblingPercent} onChange={event => setForm({ ...form, siblingPercent: event.target.value })} dir="ltr" />
            </div>
            <div>
              <Label className="mb-2 block">خصم يدوي (جنيه)</Label>
              <Input value={form.manualDiscount} onChange={event => setForm({ ...form, manualDiscount: event.target.value })} inputMode="decimal" dir="ltr" placeholder="0" />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-2 block">سبب الخصم اليدوي (مطلوب عند وجود خصم)</Label>
              <Input value={form.discountReason} onChange={event => setForm({ ...form, discountReason: event.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">تاريخ البداية</Label>
              <Input type="date" value={form.startDateKey} onChange={event => setForm({ ...form, startDateKey: event.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">تاريخ الاستحقاق</Label>
              <Input type="date" value={form.dueDateKey} onChange={event => setForm({ ...form, dueDateKey: event.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">يوم الاستحقاق الشهري (1–28)</Label>
              <Input type="number" min={1} max={28} value={form.recurringDueDay} onChange={event => setForm({ ...form, recurringDueDay: event.target.value })} dir="ltr" />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <Checkbox checked={form.reminderEnabled} onCheckedChange={value => setForm({ ...form, reminderEnabled: Boolean(value) })} />
              تفعيل تذكيرات الدفع
            </label>
            <div className="md:col-span-2">
              <Label className="mb-2 block">ملاحظات</Label>
              <Textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} rows={2} />
            </div>
          </div>
          <Button className="h-12 w-full" disabled={create.isPending || !form.studentId} onClick={submit}>
            {create.isPending ? "جاري الحفظ…" : "حفظ الاشتراك"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailId)} onOpenChange={open => !open && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الاشتراك</DialogTitle>
            <DialogDescription>
              {detail.data ? `${detail.data.student.name} · ${detail.data.subscription.course} · ${subscriptionTypeLabel(detail.data.subscription.type)}` : "جاري التحميل…"}
            </DialogDescription>
          </DialogHeader>
          {detail.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="font-bold">{money(detail.data.subscription.finalAmountMinor)}</div></div>
                <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">المدفوع</div><div className="font-bold">{money(detail.data.balance.netPaidMinor)}</div></div>
                <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">المتبقي</div><div className="font-bold">{money(detail.data.balance.remainingMinor)}</div></div>
                <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">الحالة</div><Badge className={statusTone(detail.data.balance.status)}>{invoiceStatusLabel(detail.data.balance.status)}</Badge></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="gap-1" onClick={() => { setPaymentId(detail.data!.subscription.id); setDetailId(null); }}><Wallet className="h-4 w-4" />تسجيل دفعة</Button>
                <Button variant="outline" className="gap-1" disabled={disableReminders.isPending} onClick={() => disableReminders.mutate({ id: detail.data!.subscription.id, reminderEnabled: false })}><BellOff className="h-4 w-4" />إيقاف التذكيرات</Button>
                {detail.data.subscription.type !== "one_time" ? <Button variant="outline" className="gap-1" disabled={renew.isPending} onClick={() => renew.mutate({ id: detail.data!.subscription.id })}><RefreshCw className="h-4 w-4" />تجديد</Button> : null}
                {detail.data.subscription.status === "active" ? <Button variant="ghost" className="gap-1 text-destructive" onClick={() => { setCancelId(detail.data!.subscription.id); setCancelReason(""); }}><XCircle className="h-4 w-4" />إلغاء الاشتراك</Button> : null}
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-sm"><b>تعليمات الدفع:</b> {detail.data.instructions}</div>
              <div>
                <div className="mb-2 text-sm font-semibold">سجل الدفعات</div>
                <div className="overflow-auto rounded-xl border">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-start">الإيصال</TableHead><TableHead className="text-start">التاريخ</TableHead><TableHead className="text-start">المبلغ</TableHead><TableHead className="text-start">الطريقة</TableHead><TableHead className="text-start">الموظف</TableHead><TableHead className="text-start">النوع</TableHead><TableHead className="text-start">إيصال</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detail.data.payments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell dir="ltr" className="text-xs">{payment.receiptNumber}</TableCell>
                          <TableCell className="text-xs">{new Date(payment.paymentDate).toLocaleString("ar-EG")}</TableCell>
                          <TableCell className="text-xs">{money(payment.amountMinor)}</TableCell>
                          <TableCell className="text-xs">{paymentMethodLabel(payment.method)}</TableCell>
                          <TableCell className="text-xs">{payment.recorderName || "—"}</TableCell>
                          <TableCell className="text-xs">{payment.type === "reversal" ? "قيد عكسي" : payment.status === "reversed" ? "ملغاة" : "دفعة"}</TableCell>
                          <TableCell><Button size="sm" variant="ghost" className="gap-1" onClick={() => downloadReceipt(payment.id)}><Download className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold">التذكيرات</div>
                <div className="space-y-1 text-xs">
                  {detail.data.reminders.map(reminder => (
                    <div key={reminder.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2">
                      <span>{reminderKindLabel(reminder.kind)}</span>
                      <span className="text-muted-foreground">{new Date(reminder.scheduledFor).toLocaleString("ar-EG")}</span>
                      <Badge className={statusTone(reminder.status)}>{reminderStatusLabel(reminder.status)}</Badge>
                      {reminder.error ? <span className="text-rose-600">{reminder.error}</span> : null}
                    </div>
                  ))}
                  {!detail.data.reminders.length ? <div className="text-muted-foreground">لا توجد تذكيرات.</div> : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelId)} onOpenChange={open => !open && setCancelId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>إلغاء الاشتراك</DialogTitle><DialogDescription>تبقى كل الدفعات والإيصالات محفوظة. اكتب السبب ليسجل في التدقيق.</DialogDescription></DialogHeader>
          <Input value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="سبب الإلغاء" />
          <Button variant="destructive" disabled={cancelReason.trim().length < 3 || cancel.isPending} onClick={() => cancelId ? cancel.mutate({ id: cancelId, reason: cancelReason }) : null}>
            {cancel.isPending ? "جاري الإلغاء…" : "تأكيد الإلغاء"}
          </Button>
        </DialogContent>
      </Dialog>

      {paymentId ? (
        <RecordPaymentDialog
          open={Boolean(paymentId)}
          onOpenChange={open => !open && setPaymentId(null)}
          subscriptionId={paymentId}
          studentName={list.data?.items.find(row => row.id === paymentId)?.studentName ?? detail.data?.student.name}
          course={list.data?.items.find(row => row.id === paymentId)?.course ?? detail.data?.subscription.course}
          remainingMinor={list.data?.items.find(row => row.id === paymentId)?.balance.remainingMinor ?? detail.data?.balance.remainingMinor}
          onRecorded={() => {
            utils.finance.subscriptions.get.invalidate();
            utils.finance.subscriptions.list.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
