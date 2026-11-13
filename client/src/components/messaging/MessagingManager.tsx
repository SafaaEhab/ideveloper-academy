import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EXCLUSION_REASON_LABELS,
  MESSAGE_VARIABLES,
  MESSAGE_VARIABLE_LABELS,
  TEMPLATE_CATEGORY_LABELS,
  renderMessage,
  type ExclusionReason,
} from "@shared/messaging";
import { money, statusTone } from "@/lib/phase2";
import TemplateManager from "./TemplateManager";
import CampaignHistory from "./CampaignHistory";

type Tab = "compose" | "templates" | "history" | "scheduled" | "settings";
type Source = "leads" | "students";
type MessageType = "marketing" | "transactional";

const DEFAULT_BODY =
  "مرحباً {{student_name}}،\nنود تذكيرك بخصوص كورس {{course_name}}. موعد الحصة: {{class_schedule}}.\nالمبلغ المتبقي: {{amount_due}}.\n\niDeveloper Academy";

const LEAD_STATUSES = [
  ["new", "جديد"],
  ["needs_follow_up", "يحتاج متابعة"],
  ["subscribed", "تم الاشتراك"],
  ["not_interested", "غير راغب في الإكمال"],
] as const;

export default function MessagingManager() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [searchParams] = useSearchParams();
  const initialSource = searchParams.get("source") === "students" ? "students" : "leads";
  const initialIds = (searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter(value => Number.isInteger(value) && value > 0);
  const [tab, setTab] = useState<Tab>("compose");
  const [source, setSource] = useState<Source>(initialSource);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(initialIds),
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [course, setCourse] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [messageType, setMessageType] = useState<MessageType>("marketing");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [campaignName, setCampaignName] = useState(
    `حملة ${new Date().toLocaleDateString("ar-EG")}`,
  );
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [freeFormConfirmed, setFreeFormConfirmed] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof utils.messaging.preview.fetch>
  > | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const access = Boolean(user?.phase2?.messaging);
  const isAdmin = user?.role === "admin";
  const canSettings = Boolean(user?.phase2?.financeSettings);
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const overview = trpc.messaging.overview.useQuery(undefined, {
    enabled: access,
    retry: false,
  });
  const filters = {
    status: status === "all" ? undefined : status,
    course: course === "all" ? undefined : (course as "Scratch" | "Robotics" | "Web" | "Python"),
    groupId: groupId === "all" ? undefined : Number(groupId),
    paymentStatus:
      paymentStatus === "all"
        ? undefined
        : (paymentStatus as "paid" | "due" | "overdue" | "partially_paid"),
    assignedEmployeeId: employeeId === "all" ? undefined : Number(employeeId),
    search: search.trim() || undefined,
  };
  const recipients = trpc.messaging.recipients.query.useQuery(
    { source, ...filters, page, pageSize: 20 },
    { enabled: access, retry: false },
  );
  const rows = recipients.data?.items ?? [];
  const total = recipients.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    setPage(1);
  }, [source, search, status, course, groupId, paymentStatus, employeeId]);

  useEffect(() => {
    if (!searchParams.get("source")) return;
    setSource(searchParams.get("source") === "students" ? "students" : "leads");
    setSelectedIds(
      new Set(
        (searchParams.get("ids") ?? "")
          .split(",")
          .map(Number)
          .filter(value => Number.isInteger(value) && value > 0),
      ),
    );
  }, [searchParams]);

  const templates = (overview.data?.templates ?? []).filter(template => template.active);
  const selectedTemplate = templates.find(template => template.id === templateId) ?? null;
  const localPreviewSource = rows.find(row => selectedIds.has(row.recipientId)) ?? rows[0] ?? null;
  const localPreview = localPreviewSource
    ? renderMessage(body, localPreviewSource.variables)
    : null;

  const toggleRecipient = (id: number) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectFiltered = async () => {
    setSelecting(true);
    try {
      const result = await utils.messaging.recipients.ids.fetch({
        source,
        ...filters,
      });
      setSelectedIds(new Set(result.ids));
      toast.success(`تم تحديد ${result.total} مستلماً مطابقاً`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديد النتائج");
    } finally {
      setSelecting(false);
    }
  };

  const chooseTemplate = (value: string) => {
    if (value === "none") {
      setTemplateId(null);
      return;
    }
    const template = templates.find(item => item.id === Number(value));
    if (!template) return;
    setTemplateId(template.id);
    setBody(template.body);
    toast.success(`تم تحميل قالب: ${template.name}`);
  };

  const insertVariable = (variable: string) => {
    setBody(current => `${current}{{${variable}}}`);
  };

  const review = async () => {
    if (!selectedIds.size) {
      toast.error("حدد مستلماً واحداً على الأقل");
      return;
    }
    if (!body.trim()) {
      toast.error("اكتب نص الرسالة");
      return;
    }
    if (!templateId && messageType === "marketing") {
      toast.error("الحملة التسويقية تحتاج قالب Meta معتمداً");
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await utils.messaging.preview.fetch({
        source,
        filters: { ...filters, ids: selectedArray },
        body,
        messageType,
        templateId,
      });
      setPreview(result);
      setConfirmOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذرت المعاينة");
    } finally {
      setPreviewLoading(false);
    }
  };

  const create = trpc.messaging.campaigns.create.useMutation({
    onSuccess: result => {
      toast.success(
        result.status === "scheduled"
          ? "تم جدولة الحملة. يمكنك إلغاؤها قبل التنفيذ."
          : "تم إنشاء الحملة وبدأت المعالجة في الخلفية",
      );
      setConfirmOpen(false);
      setPreview(null);
      utils.messaging.campaigns.list.invalidate();
      setTab(result.status === "scheduled" ? "scheduled" : "history");
    },
    onError: error => toast.error(error.message),
  });

  const confirmSend = () => {
    if (!preview) return;
    if (scheduleMode === "scheduled" && !scheduledAt) {
      toast.error("حدد موعد الجدولة");
      return;
    }
    create.mutate({
      name: campaignName,
      source,
      filters: { ...filters, ids: selectedArray },
      body,
      messageType,
      templateId,
      scheduledAt:
        scheduleMode === "scheduled"
          ? new Date(scheduledAt).toISOString()
          : null,
      freeFormWindowConfirmed: freeFormConfirmed,
      confirm: true,
      expectedEligibleCount: preview.eligibleCount,
    });
  };

  if (!access) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
        <h2 className="mt-3 text-xl font-bold">لا تملك صلاحية المراسلة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          هذه المساحة لموظفي المتابعة المصرح لهم. اطلب من الأدمن تفعيل صلاحية
          المراسلة لحسابك.
        </p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
    { key: "compose", label: "إنشاء حملة", icon: Send },
    { key: "templates", label: "القوالب", icon: MessageSquare },
    { key: "history", label: "سجل الحملات", icon: Users },
    { key: "scheduled", label: "المجدولة", icon: CalendarClock },
    { key: "settings", label: "إعدادات المراسلة", icon: Settings2 },
  ];

  return (
    <div dir="rtl" className="min-w-0 max-w-full space-y-5 overflow-x-hidden text-start">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <MessageSquare className="h-4 w-4" />
            المراسلة الجماعية
          </div>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">
            رسائل WhatsApp للعملاء والطلاب
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            اختيار مستلمين، معاينة المتغيرات، استبعاد غير المؤهلين، تأكيد صريح،
            إرسال فوري أو مجدول، ومتابعة حالة التوصيل.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => overview.refetch()}>
          <RefreshCw className={overview.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          تحديث
        </Button>
      </div>

      {!overview.data?.whatsapp.configured ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <b>WhatsApp غير مهيأ على السيرفر.</b> يمكنك تجهيز الحملة
              ومعاينتها، لكن أي محاولة إرسال ستُسجل كفشل واضح ولن يتم ادعاء
              نجاحها. المتغيرات الناقصة:{" "}
              <span dir="ltr" className="font-mono text-xs">
                {(overview.data?.whatsapp.missing ?? []).join(", ")}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="me-1 inline h-4 w-4" />
          إعدادات WhatsApp موجودة. يتم التحقق من اعتماد القالب مباشرة من Meta
          قبل بدء أي حملة.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map(item => (
          <Button
            key={item.key}
            variant={tab === item.key ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTab(item.key)}
          >
            <item.icon className="me-2 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "templates" ? <TemplateManager isAdmin={isAdmin} /> : null}
      {tab === "history" ? <CampaignHistory /> : null}
      {tab === "scheduled" ? <CampaignHistory scheduledOnly /> : null}
      {tab === "settings" ? (
        <MessagingSettingsPanel
          canSettings={canSettings}
          config={overview.data?.whatsapp}
          templates={templates}
        />
      ) : null}

      {tab === "compose" ? (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <Card className="min-w-0 rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1) اختيار المستلمين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={source === "leads" ? "default" : "outline"}
                  onClick={() => {
                    setSource("leads");
                    setSelectedIds(new Set());
                    setStatus("all");
                    setPaymentStatus("all");
                  }}
                >
                  العملاء المحتملون
                </Button>
                <Button
                  size="sm"
                  variant={source === "students" ? "default" : "outline"}
                  onClick={() => {
                    setSource("students");
                    setSelectedIds(new Set());
                    setStatus("all");
                    setGroupId("all");
                    setPaymentStatus("all");
                  }}
                >
                  الطلاب
                </Button>
                <Badge variant="secondary">المحددون: {selectedIds.size}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selecting}
                  onClick={selectFiltered}
                >
                  {selecting ? "جاري التحديد…" : "تحديد كل النتائج المصفاة"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!selectedIds.size}
                  onClick={() => setSelectedIds(new Set())}
                >
                  مسح التحديد
                </Button>
              </div>

              {initialIds.length ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                  وصل {initialIds.length} مستلماً محدداً من شاشة{" "}
                  {initialSource === "students" ? "الطلاب" : "العملاء"}.
                  سيعاد التحقق من أهليتهم هنا قبل الإرسال.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="relative sm:col-span-2 xl:col-span-1">
                  <Label className="mb-1.5 block text-xs">بحث</Label>
                  <Search className="pointer-events-none absolute bottom-3 start-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="اسم أو رقم"
                    className="ps-9"
                  />
                </div>
                {source === "leads" ? (
                  <div>
                    <Label className="mb-1.5 block text-xs">حالة العميل</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        {LEAD_STATUSES.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label className="mb-1.5 block text-xs">حالة الطالب</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="paused">موقوف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="mb-1.5 block text-xs">الكورس</Label>
                  <Select value={course} onValueChange={setCourse}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الكورسات</SelectItem>
                      {["Scratch", "Robotics", "Web", "Python"].map(value => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {source === "students" ? (
                  <>
                    <div>
                      <Label className="mb-1.5 block text-xs">المجموعة</Label>
                      <Select value={groupId} onValueChange={setGroupId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل المجموعات</SelectItem>
                          {(overview.data?.groups ?? []).map(group => (
                            <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>
                          ))}
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
                  </>
                ) : null}
                <div>
                  <Label className="mb-1.5 block text-xs">الموظف المسؤول</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الموظفين</SelectItem>
                      {(overview.data?.employees ?? []).map(employee => (
                        <SelectItem key={employee.userId} value={String(employee.userId)}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{total} مستلماً مطابقاً للفلاتر</span>
                <span>
                  المؤهلون حسب القواعد الحالية: {recipients.data?.eligibleCount ?? 0}
                </span>
              </div>

              {recipients.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-xl bg-muted/50" />
                  ))}
                </div>
              ) : recipients.isError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {recipients.error.message}
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  لا يوجد مستلمون مطابقون.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 text-start">
                          <Checkbox
                            aria-label="تحديد الصفحة"
                            checked={rows.every(row => selectedIds.has(row.recipientId))}
                            onCheckedChange={value =>
                              setSelectedIds(current => {
                                const next = new Set(current);
                                for (const row of rows) {
                                  if (value) next.add(row.recipientId);
                                  else next.delete(row.recipientId);
                                }
                                return next;
                              })
                            }
                          />
                        </TableHead>
                        <TableHead className="text-start">الاسم</TableHead>
                        <TableHead className="text-start">الهاتف</TableHead>
                        <TableHead className="text-start">الكورس</TableHead>
                        <TableHead className="text-start">الحالة</TableHead>
                        <TableHead className="text-start">الأهلية</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(row => (
                        <TableRow key={`${row.recipientType}-${row.recipientId}`}>
                          <TableCell>
                            <Checkbox
                              aria-label={`تحديد ${row.name}`}
                              checked={selectedIds.has(row.recipientId)}
                              onCheckedChange={() => toggleRecipient(row.recipientId)}
                            />
                          </TableCell>
                          <TableCell className="text-start font-medium">
                            {row.name}
                            {row.groupName ? (
                              <div className="text-[10px] text-muted-foreground">{row.groupName}</div>
                            ) : null}
                          </TableCell>
                          <TableCell dir="ltr" className="text-start text-xs">
                            {row.phone || row.rawPhone || "—"}
                          </TableCell>
                          <TableCell className="text-xs">{row.courseName || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{row.statusLabel}</Badge>
                          </TableCell>
                          <TableCell>
                            {row.eligible ? (
                              <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                مؤهل
                              </Badge>
                            ) : (
                              <Badge className={statusTone("failed")}>
                                {row.exclusionLabel ?? "مستبعد"}
                              </Badge>
                            )}
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
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
                    <ChevronRight className="h-4 w-4" /> السابق
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>
                    التالي <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2) الرسالة والتأكيد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block text-xs">اسم الحملة</Label>
                <Input
                  aria-label="اسم الحملة"
                  value={campaignName}
                  onChange={event => setCampaignName(event.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs">نوع الرسالة</Label>
                  <Select value={messageType} onValueChange={value => setMessageType(value as MessageType)}>
                    <SelectTrigger aria-label="نوع الرسالة"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing">تسويقية (تحتاج موافقة)</SelectItem>
                      <SelectItem value="transactional">معاملاتية / خدمية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-xs">قالب Meta</Label>
                  <Select value={templateId ? String(templateId) : "none"} onValueChange={chooseTemplate}>
                    <SelectTrigger aria-label="قالب Meta"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون قالب (داخل نافذة 24 ساعة فقط)</SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {template.name} · {TEMPLATE_CATEGORY_LABELS[template.category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Meta: {selectedTemplate.metaTemplateName || "غير مرتبط"} · محلياً {selectedTemplate.metaStatus}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <Label>نص الرسالة</Label>
                  <div className="flex flex-wrap gap-1">
                    {MESSAGE_VARIABLES.map(variable => (
                      <Button
                        key={variable}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        onClick={() => insertVariable(variable)}
                      >
                        {`{{${variable}}}`}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea value={body} onChange={event => setBody(event.target.value)} rows={8} />
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {MESSAGE_VARIABLES.map(variable => (
                    <span key={variable}>{MESSAGE_VARIABLE_LABELS[variable]}: {`{{${variable}}}`}</span>
                  ))}
                </div>
              </div>

              {localPreview ? (
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                  <div className="mb-1 text-xs font-semibold">معاينة سريعة — {localPreviewSource?.name}</div>
                  <div className="whitespace-pre-wrap text-sm leading-7">{localPreview.text}</div>
                  {localPreview.missing.length ? (
                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      قيم ناقصة ستظهر كـ «—»: {localPreview.missing.join(", ")}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs">التوقيت</Label>
                  <Select value={scheduleMode} onValueChange={value => setScheduleMode(value as "now" | "scheduled")}>
                    <SelectTrigger aria-label="التوقيت"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">إرسال فوري</SelectItem>
                      <SelectItem value="scheduled">جدولة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scheduleMode === "scheduled" ? (
                  <div>
                    <Label className="mb-2 block text-xs">موعد الإرسال</Label>
                    <Input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} />
                  </div>
                ) : null}
              </div>

              {!templateId ? (
                <label className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <Checkbox checked={freeFormConfirmed} onCheckedChange={value => setFreeFormConfirmed(Boolean(value))} className="mt-0.5" />
                  <span>
                    أؤكد أن كل المستلمين تواصلوا مع الأكاديمية خلال آخر 24 ساعة
                    (نافذة خدمة العميل)، وأن هذه ليست حملة تسويقية.
                  </span>
                </label>
              ) : null}

              <div className="rounded-2xl border border-border/60 p-3 text-xs text-muted-foreground">
                سيطلب النظام تأكيداً نهائياً يعرض عدد المؤهلين، كل المستبعدين
                وأسبابهم، والأرقام غير الصالحة قبل أي إرسال.
              </div>

              <Button className="h-12 w-full gap-2" disabled={previewLoading || !selectedIds.size} onClick={review}>
                <Send className="h-4 w-4" />
                {previewLoading ? "جاري تجهيز المعاينة…" : "مراجعة وتأكيد الإرسال"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>تأكيد الحملة قبل الإرسال</DialogTitle>
            <DialogDescription>
              لا يتم إرسال أي رسالة قبل ضغط زر التأكيد. هذه هي النتيجة
              المحسوبة على السيرفر الآن.
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-2xl font-bold">{preview.eligibleCount}</div>
                  <div className="text-xs text-muted-foreground">مؤهل</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-2xl font-bold">{preview.excludedCount}</div>
                  <div className="text-xs text-muted-foreground">مستبعد</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-2xl font-bold">{preview.notInterestedCount}</div>
                  <div className="text-xs text-muted-foreground">غير راغب</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-2xl font-bold">{preview.optedOutCount}</div>
                  <div className="text-xs text-muted-foreground">أوقف الرسائل</div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 p-3">
                <div className="mb-1 text-xs font-semibold">
                  معاينة أول مستلم: {preview.preview?.recipientName ?? "—"}{" "}
                  {preview.preview?.phone ? `(${preview.preview.phone})` : ""}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7">
                  {preview.preview?.text || "—"}
                </div>
                {preview.preview?.missing.length ? (
                  <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                    قيم ناقصة: {preview.preview.missing.join(", ")}
                  </div>
                ) : null}
              </div>

              {preview.exclusionGroups.length ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="mb-2 text-xs font-semibold">المستبعدون وأسبابهم</div>
                  <div className="space-y-1 text-xs">
                    {preview.exclusionGroups.map(group => (
                      <div key={group.reason} className="flex justify-between gap-3">
                        <span>{group.label}</span>
                        <b>{group.count}</b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {preview.excluded.length ? (
                <div className="max-h-40 overflow-auto rounded-xl border p-2 text-xs">
                  {preview.excluded.slice(0, 100).map((row, index) => (
                    <div key={`${row.recipientType}-${row.recipientId}-${index}`} className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-0">
                      <span>{row.name}</span>
                      <span className="text-muted-foreground" dir="ltr">{row.phone || "—"}</span>
                      <span className="text-rose-600">{row.reasonLabel}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {preview.templateProblem ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {preview.templateProblem}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                القالب: {preview.template?.name ?? "بدون قالب"} · سيتم التحقق
                من اعتماده عند Meta عند بدء المعالجة. النجاح هنا لا يعني أن
                Meta قبلت الرسالة.
              </div>
              <Button
                className="h-12 w-full"
                disabled={create.isPending || preview.eligibleCount === 0 || Boolean(preview.templateProblem)}
                onClick={confirmSend}
              >
                {create.isPending
                  ? "جاري إنشاء الحملة…"
                  : scheduleMode === "scheduled"
                    ? "تأكيد وجدولة الحملة"
                    : "تأكيد وبدء الإرسال"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessagingSettingsPanel({
  canSettings,
  config,
  templates,
}: {
  canSettings: boolean;
  config?: {
    configured: boolean;
    missing: string[];
    apiVersion: string;
    hasPhoneNumberId: boolean;
    hasBusinessAccountId: boolean;
  };
  templates: Array<{ id: number; name: string; metaTemplateName: string | null; metaStatus: string }>;
}) {
  const utils = trpc.useUtils();
  const settings = trpc.finance.settings.get.useQuery(undefined, {
    enabled: canSettings,
    retry: false,
  });
  const [form, setForm] = useState({
    batchSize: "25",
    delayMs: "1000",
    retryLimit: "3",
    requireMarketingConsent: true,
    paymentReminderTemplateName: "",
    paymentReminderTemplateLanguage: "ar",
    thankYouEnabled: false,
    thankYouTemplateName: "",
    thankYouTemplateLanguage: "ar",
  });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!settings.data || loaded) return;
    setForm({
      batchSize: String(settings.data.batchSize),
      delayMs: String(settings.data.delayMs),
      retryLimit: String(settings.data.retryLimit),
      requireMarketingConsent: settings.data.requireMarketingConsent,
      paymentReminderTemplateName: settings.data.paymentReminderTemplateName,
      paymentReminderTemplateLanguage: settings.data.paymentReminderTemplateLanguage,
      thankYouEnabled: settings.data.thankYouEnabled,
      thankYouTemplateName: settings.data.thankYouTemplateName,
      thankYouTemplateLanguage: settings.data.thankYouTemplateLanguage,
    });
    setLoaded(true);
  }, [settings.data, loaded]);
  const update = trpc.finance.settings.update.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المراسلة");
      utils.finance.settings.get.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="rounded-3xl">
        <CardHeader><CardTitle className="text-base">حالة اتصال WhatsApp</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span>الاتصال</span>
            <Badge className={config?.configured ? statusTone("paid") : statusTone("failed")}>
              {config?.configured ? "مهيأ" : "غير مهيأ"}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>إصدار API: <span dir="ltr">{config?.apiVersion ?? "—"}</span></div>
            <div>Phone Number ID: {config?.hasPhoneNumberId ? "موجود" : "ناقص"}</div>
            <div>Business Account ID: {config?.hasBusinessAccountId ? "موجود" : "ناقص"}</div>
            {config?.missing.length ? (
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-700 dark:text-rose-300">
                المتغيرات الناقصة: <span dir="ltr" className="font-mono">{config.missing.join(", ")}</span>
              </div>
            ) : null}
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            لا تُعرض القيم السرية هنا أبداً. تُضاف المتغيرات في MonsterASP أو
            بيئة السيرفر فقط.
          </p>
          <div className="rounded-xl border p-3">
            <div className="mb-2 text-xs font-semibold">قوالب Meta المسجلة</div>
            <div className="max-h-48 space-y-1 overflow-auto text-xs">
              {templates.length ? templates.map(template => (
                <div key={template.id} className="flex items-center justify-between gap-2">
                  <span>{template.name}</span>
                  <Badge className={statusTone(template.metaStatus)}>{template.metaStatus}</Badge>
                </div>
              )) : <span className="text-muted-foreground">لا توجد قوالب.</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader><CardTitle className="text-base">ضبط الإرسال والتذكيرات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!canSettings ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              تعديل إعدادات المراسلة المالية متاح للأدمن أو لموظف لديه صلاحية
              إعدادات مالية صريحة.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="mb-1 block text-xs">حجم الدفعة</Label><Input type="number" min={1} max={100} value={form.batchSize} onChange={e => setForm({ ...form, batchSize: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">التأخير (ms)</Label><Input type="number" min={250} max={60000} value={form.delayMs} onChange={e => setForm({ ...form, delayMs: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">حد المحاولات</Label><Input type="number" min={0} max={10} value={form.retryLimit} onChange={e => setForm({ ...form, retryLimit: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.requireMarketingConsent} onCheckedChange={value => setForm({ ...form, requireMarketingConsent: Boolean(value) })} />
                اشتراط موافقة WhatsApp للحملات التسويقية
              </label>
              <div><Label className="mb-1 block text-xs">قالب تذكير الدفع المعتمد</Label><Input value={form.paymentReminderTemplateName} onChange={e => setForm({ ...form, paymentReminderTemplateName: e.target.value })} placeholder="payment_reminder_ar" dir="ltr" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="mb-1 block text-xs">لغة قالب التذكير</Label><Input value={form.paymentReminderTemplateLanguage} onChange={e => setForm({ ...form, paymentReminderTemplateLanguage: e.target.value })} dir="ltr" /></div>
                <div><Label className="mb-1 block text-xs">قالب الشكر</Label><Input value={form.thankYouTemplateName} onChange={e => setForm({ ...form, thankYouTemplateName: e.target.value })} placeholder="payment_thank_you" dir="ltr" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.thankYouEnabled} onCheckedChange={value => setForm({ ...form, thankYouEnabled: Boolean(value) })} />
                إرسال رسالة شكر عند سداد الاشتراك بالكامل
              </label>
              <Button
                className="w-full"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({
                    batchSize: Number(form.batchSize),
                    delayMs: Number(form.delayMs),
                    retryLimit: Number(form.retryLimit),
                    requireMarketingConsent: form.requireMarketingConsent,
                    paymentReminderTemplateName: form.paymentReminderTemplateName,
                    paymentReminderTemplateLanguage: form.paymentReminderTemplateLanguage,
                    thankYouEnabled: form.thankYouEnabled,
                    thankYouTemplateName: form.thankYouTemplateName,
                    thankYouTemplateLanguage: form.thankYouTemplateLanguage,
                  })
                }
              >
                {update.isPending ? "جاري الحفظ…" : "حفظ إعدادات المراسلة"}
              </Button>
            </>
          )}
          <p className="text-xs leading-6 text-muted-foreground">
            التذكيرات التلقائية تُدار من تبويب الحسابات → الإعدادات، بما فيها
            المواعيد وساعات العمل وبيانات التحويل.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
