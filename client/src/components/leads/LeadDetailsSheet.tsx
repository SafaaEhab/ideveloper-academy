import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Check,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";
import {
  LEAD_ACTIVITY_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  genderLabel,
  leadStatusLabel,
  notInterestedReasonLabel,
  type LeadStatus,
} from "@shared/leads";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import LeadStatusDialog from "./LeadStatusDialog";
import {
  formatLeadDate,
  statusTone,
  syncLabel,
  syncTone,
  toDateTimeLocal,
} from "./leadsUi";

type Props = {
  leadId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 break-words text-sm">{value ?? "—"}</div>
    </div>
  );
}

export default function LeadDetailsSheet({
  leadId,
  open,
  onOpenChange,
}: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const detailQuery = trpc.leads.detail.useQuery(
    { id: leadId ?? 0 },
    { enabled: open && leadId != null, retry: false, refetchInterval: 30_000 }
  );
  const employees = trpc.leads.employees.useQuery(undefined, {
    enabled: open && Boolean(user?.leadAccess),
    retry: false,
  });
  const lead = detailQuery.data;

  const [assigned, setAssigned] = useState("none");
  const [followUp, setFollowUp] = useState("");
  const [whatsappOptOut, setWhatsappOptOut] = useState(false);
  const [notes, setNotes] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [contactFollowUp, setContactFollowUp] = useState("");
  const [statusTarget, setStatusTarget] = useState<
    "needs_follow_up" | "not_interested" | null
  >(null);
  const [credentials, setCredentials] = useState<{
    studentId: number;
    accessCode: string;
    alreadyConverted: boolean;
  } | null>(null);
  const [revealCode, setRevealCode] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setAssigned(
      lead.assignedEmployeeId ? String(lead.assignedEmployeeId) : "none"
    );
    setFollowUp(toDateTimeLocal(lead.nextFollowUpDate));
    setWhatsappOptOut(lead.whatsAppOptOut);
    setNotes(lead.internalNotes ?? "");
    setContactNote("");
    setContactFollowUp("");
    setRevealCode(false);
  }, [lead?.id]);

  const invalidate = () => {
    utils.leads.list.invalidate();
    if (leadId) utils.leads.detail.invalidate({ id: leadId });
  };

  const update = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ بيانات العميل");
      invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const logContact = trpc.leads.logContact.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل التواصل");
      setContactNote("");
      setContactFollowUp("");
      invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const retrySync = trpc.leads.retrySync.useMutation({
    onSuccess: result => {
      if (result.ok) toast.success("تمت مزامنة العميل مع Google Sheets");
      else toast.error(result.error || "لم تتم المزامنة");
      invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const convert = trpc.leads.convert.useMutation({
    onSuccess: result => {
      setCredentials({
        studentId: result.studentId,
        accessCode: result.accessCode,
        alreadyConverted: result.alreadyConverted,
      });
      if (result.alreadyConverted) {
        toast.success("هذا العميل محوّل بالفعل إلى طالب");
      } else {
        toast.success("تم تحويل العميل إلى طالب");
      }
      invalidate();
      utils.admin.students.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const employeeOptions = employees.data ?? [];
  const customerWhatsApp = useMemo(() => {
    if (!lead) return "";
    const digits = lead.studentPhone.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
  }, [lead]);

  const saveFollowUp = () => {
    if (!lead) return;
    update.mutate({
      id: lead.id,
      assignedEmployeeId: assigned === "none" ? null : Number(assigned),
      nextFollowUpDate: followUp ? new Date(followUp).toISOString() : null,
      whatsAppOptOut: whatsappOptOut,
    });
  };

  const saveNotes = () => {
    if (!lead) return;
    update.mutate({ id: lead.id, internalNotes: notes.trim() || null });
  };

  const submitContact = () => {
    if (!lead) return;
    logContact.mutate({
      id: lead.id,
      note: contactNote.trim() || null,
      nextFollowUpDate: contactFollowUp
        ? new Date(contactFollowUp).toISOString()
        : undefined,
    });
  };

  const onStatusChange = (value: LeadStatus) => {
    if (!lead) return;
    if (value === "needs_follow_up" || value === "not_interested") {
      setStatusTarget(value);
      return;
    }
    updateStatus.mutate({
      id: lead.id,
      status: value,
      nextFollowUpDate: null,
    });
  };

  const targetLead = lead
    ? {
        id: lead.id,
        fullName: lead.fullName,
        status: lead.status as LeadStatus,
        nextFollowUpDate: lead.nextFollowUpDate,
      }
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          dir="rtl"
          className="w-full overflow-y-auto p-0 sm:max-w-2xl"
        >
          <div className="border-b border-border/60 bg-muted/20 px-5 py-5">
            <SheetHeader className="text-start">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-xl">
                  {lead?.fullName ?? "تفاصيل العميل"}
                </SheetTitle>
                {lead ? (
                  <Badge className={statusTone(lead.status)}>
                    {LEAD_STATUS_LABELS[lead.status]}
                  </Badge>
                ) : null}
                {lead?.isOverdue ? (
                  <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                    متأخر في الاتصال
                  </Badge>
                ) : null}
              </div>
              <SheetDescription>
                {lead ? (
                  <>
                    عميل #{lead.id} — {lead.course} — تم التسجيل{" "}
                    {formatLeadDate(lead.registrationDate)}
                  </>
                ) : (
                  "جارٍ تحميل بيانات العميل…"
                )}
              </SheetDescription>
            </SheetHeader>

            {lead ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Select
                  value={lead.status}
                  onValueChange={value => onStatusChange(value as LeadStatus)}
                >
                  <SelectTrigger
                    className="h-9 w-52 bg-background"
                    aria-label="تغيير الحالة"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STATUS_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {user?.canConvertLeads && !lead.convertedStudentId ? (
                  <Button
                    onClick={() => convert.mutate({ id: lead.id })}
                    disabled={convert.isPending}
                    className="gap-2"
                  >
                    {convert.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserRoundCheck className="h-4 w-4" />
                    )}
                    تحويل إلى طالب
                  </Button>
                ) : null}
                {lead.convertedStudentId ? (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Check className="me-1 h-3.5 w-3.5" />
                    محوّل إلى طالب #{lead.convertedStudentId}
                  </Badge>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => retrySync.mutate({ id: lead.id })}
                  disabled={retrySync.isPending}
                >
                  <RefreshCw
                    className={
                      retrySync.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
                    }
                  />
                  إعادة مزامنة Sheets
                </Button>
                <a href={customerWhatsApp} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    واتساب العميل
                  </Button>
                </a>
              </div>
            ) : null}
          </div>

          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center p-16 text-sm text-muted-foreground">
              <Loader2 className="me-2 h-5 w-5 animate-spin" />
              جارٍ تحميل التفاصيل…
            </div>
          ) : detailQuery.isError ? (
            <div className="p-6">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                تعذّر تحميل بيانات العميل. {detailQuery.error.message}
                <Button
                  variant="outline"
                  size="sm"
                  className="ms-3"
                  onClick={() => detailQuery.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          ) : lead ? (
            <div className="space-y-6 p-5">
              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">بيانات التسجيل</h3>
                  <Badge className={syncTone(lead.googleSheetSyncStatus)}>
                    {syncLabel(lead.googleSheetSyncStatus)}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <DataRow label="اسم العميل" value={lead.fullName} />
                  <DataRow
                    label="رقم الهاتف"
                    value={<span dir="ltr">{lead.studentPhone}</span>}
                  />
                  <DataRow label="الكورس" value={lead.course} />
                  <DataRow label="السن" value={`${lead.age} سنة`} />
                  <DataRow label="المدرسة" value={lead.school} />
                  <DataRow label="الجنس" value={genderLabel(lead.gender)} />
                  <DataRow label="العنوان" value={lead.address} />
                  <DataRow
                    label="هل لديه أخ مسجل؟"
                    value={lead.hasRegisteredSibling ? "نعم" : "لا"}
                  />
                  {lead.hasRegisteredSibling ? (
                    <>
                      <DataRow
                        label="اسم الأخ / الأخت"
                        value={lead.siblingName}
                      />
                      <DataRow
                        label="رقم الأخ / الأخت"
                        value={
                          lead.siblingPhone ? (
                            <span dir="ltr">{lead.siblingPhone}</span>
                          ) : null
                        }
                      />
                    </>
                  ) : null}
                  <DataRow
                    label="بريد ولي الأمر"
                    value={<span dir="ltr">{lead.parentEmail}</span>}
                  />
                  <DataRow
                    label="رقم ولي الأمر"
                    value={<span dir="ltr">{lead.parentPhone}</span>}
                  />
                  <DataRow
                    label="تاريخ التسجيل"
                    value={formatLeadDate(lead.registrationDate)}
                  />
                  <DataRow
                    label="آخر تواصل"
                    value={formatLeadDate(lead.lastContactDate)}
                  />
                  <DataRow
                    label="المتابعة القادمة"
                    value={formatLeadDate(lead.nextFollowUpDate)}
                  />
                  <DataRow
                    label="مصدر التسجيل"
                    value={LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
                  />
                  <DataRow
                    label="محاولات مكررة"
                    value={
                      lead.duplicateAttempts > 0
                        ? `${lead.duplicateAttempts}`
                        : "لا يوجد"
                    }
                  />
                  {lead.notInterestedReason ? (
                    <>
                      <DataRow
                        label="سبب عدم الإكمال"
                        value={notInterestedReasonLabel(lead.notInterestedReason)}
                      />
                      {lead.notInterestedNote ? (
                        <DataRow
                          label="تفاصيل السبب"
                          value={lead.notInterestedNote}
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
                {lead.customerNotes ? (
                  <div className="mt-2 rounded-xl border border-border/60 bg-amber-500/5 px-3 py-2">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      ملاحظات العميل المرسلة مع التسجيل
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                      {lead.customerNotes}
                    </p>
                  </div>
                ) : null}
                {lead.googleSheetSyncStatus === "failed" ? (
                  <div className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                    <b>لم يتم النسخ إلى Google Sheets.</b>{" "}
                    {lead.googleSheetSyncError || "راجع إعدادات المزامنة."}
                  </div>
                ) : null}
              </section>

              {lead.convertedStudent ? (
                <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <h3 className="font-semibold">الطالب المرتبط</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span>
                      الطالب #{lead.convertedStudent.id} —{" "}
                      {lead.convertedStudent.name}
                    </span>
                    {user?.role === "admin" || user?.canConvertLeads ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevealCode(value => !value)}
                        >
                          {revealCode ? "إخفاء رمز الدخول" : "إظهار رمز الدخول"}
                        </Button>
                        {revealCode ? (
                          <code className="rounded-lg bg-background px-2 py-1 font-mono text-xs">
                            {lead.convertedStudent.accessCode}
                          </code>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              lead.convertedStudent!.accessCode
                            );
                            toast.success("تم نسخ رمز الدخول");
                          }}
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" />
                          نسخ
                        </Button>
                      </>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    هذا هو رمز دخول بوابة الطالب المستخدم في النظام الحالي، ولا
                    يُخزَّن ككلمة مرور.
                  </p>
                </section>
              ) : null}

              <section>
                <h3 className="mb-3 font-semibold">إدارة المتابعة</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-2 block text-sm">الموظف المسؤول</Label>
                    <Select value={assigned} onValueChange={setAssigned}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="غير مسند" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">غير مسند</SelectItem>
                        {employeeOptions.map(employee => (
                          <SelectItem
                            key={employee.userId}
                            value={String(employee.userId)}
                          >
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="lead-next-follow-up"
                      className="mb-2 block text-sm"
                    >
                      المتابعة القادمة
                    </Label>
                    <Input
                      id="lead-next-follow-up"
                      type="datetime-local"
                      value={followUp}
                      onChange={event => setFollowUp(event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                  <div>
                    <div className="text-sm font-medium">
                      إلغاء رسائل واتساب
                    </div>
                    <p className="text-xs text-muted-foreground">
                      عند التفعيل يمتنع النظام عن إرسال رسائل واتساب لهذا
                      العميل.
                    </p>
                  </div>
                  <Switch
                    checked={whatsappOptOut}
                    onCheckedChange={setWhatsappOptOut}
                    aria-label="إلغاء رسائل واتساب"
                  />
                </div>
                <Button
                  className="mt-3"
                  onClick={saveFollowUp}
                  disabled={update.isPending}
                >
                  {update.isPending ? "جارٍ الحفظ…" : "حفظ إعدادات المتابعة"}
                </Button>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">تسجيل تواصل</h3>
                <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                  <Textarea
                    id="lead-contact-note"
                    value={contactNote}
                    onChange={event => setContactNote(event.target.value)}
                    placeholder="ماذا حدث في المكالمة؟"
                    aria-label="تفاصيل التواصل"
                    rows={2}
                    maxLength={2000}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Label className="mb-1.5 block text-xs">
                        تحديد متابعة قادمة (اختياري)
                      </Label>
                      <Input
                        type="datetime-local"
                        value={contactFollowUp}
                        onChange={event =>
                          setContactFollowUp(event.target.value)
                        }
                      />
                    </div>
                    <Button
                      onClick={submitContact}
                      disabled={logContact.isPending}
                    >
                      {logContact.isPending ? "جارٍ التسجيل…" : "تسجيل التواصل"}
                    </Button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">الملاحظات الداخلية</h3>
                  <span className="text-xs text-muted-foreground">
                    لا تظهر للعميل
                  </span>
                </div>
                <Textarea
                  id="lead-internal-notes"
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  aria-label="الملاحظات الداخلية"
                  rows={4}
                  maxLength={10_000}
                />
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={saveNotes}
                  disabled={update.isPending}
                >
                  حفظ الملاحظات
                </Button>
              </section>

              <section>
                <h3 className="mb-3 font-semibold">سجل النشاط والتواصل</h3>
                {lead.activities.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    لا يوجد نشاط مسجل بعد.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {lead.activities.map(activity => (
                      <li
                        key={activity.id}
                        className="relative rounded-xl border border-border/60 bg-card/50 p-3 ps-4"
                      >
                        <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary/30" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {LEAD_ACTIVITY_LABELS[activity.type] ??
                              activity.type}
                            {activity.type === "status_changed" &&
                            activity.previousStatus &&
                            activity.newStatus ? (
                              <span className="text-xs font-normal text-muted-foreground">
                                {leadStatusLabel(activity.previousStatus)} ←{" "}
                                {leadStatusLabel(activity.newStatus)}
                              </span>
                            ) : null}
                          </div>
                          <time className="text-xs text-muted-foreground">
                            {formatLeadDate(activity.createdAt)}
                          </time>
                        </div>
                        {activity.note ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {activity.note}
                          </p>
                        ) : null}
                        {activity.employeeName ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            بواسطة {activity.employeeName}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <div className="flex justify-end pb-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {targetLead && statusTarget ? (
        <LeadStatusDialog
          open={Boolean(statusTarget)}
          onOpenChange={next => {
            if (!next) setStatusTarget(null);
          }}
          lead={targetLead}
          targetStatus={statusTarget}
          onDone={() => setStatusTarget(null)}
        />
      ) : null}

      <Dialog
        open={Boolean(credentials)}
        onOpenChange={next => {
          if (!next) setCredentials(null);
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {credentials?.alreadyConverted
                ? "العميل محوّل بالفعل"
                : "تم تحويل العميل إلى طالب"}
            </DialogTitle>
            <DialogDescription>
              {credentials?.alreadyConverted
                ? "لم يتم إنشاء حساب جديد. هذه بيانات الطالب الموجود."
                : "تم إنشاء حساب الطالب وربطه بالكورس. احتفظ برمز الدخول وسلّمه لولي الأمر."}
            </DialogDescription>
          </DialogHeader>
          {credentials ? (
            <div className="space-y-3 text-start">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">رقم الطالب</div>
                <div className="font-semibold">#{credentials.studentId}</div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="text-xs text-muted-foreground">
                  رمز الدخول لبوابة الطالب
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <code className="font-mono text-lg font-bold text-primary">
                    {credentials.accessCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.accessCode);
                      toast.success("تم نسخ رمز الدخول");
                    }}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    نسخ
                  </Button>
                </div>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                لا تشارك الرمز علنًا. يمكن لولي الأمر استخدامه في صفحة دخول
                الطالب.
              </p>
              {user?.role === "admin" ? (
                <Link
                  href="/admin?tab=students"
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  عرض الطالب في لوحة الطلاب
                  <ExternalLink className="ms-1 inline h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>تم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
