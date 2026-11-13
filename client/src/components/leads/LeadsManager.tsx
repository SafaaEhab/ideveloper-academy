import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_SHORT_LABELS,
  type LeadStatus,
} from "@shared/leads";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import LeadDetailsSheet from "./LeadDetailsSheet";
import LeadEmployeesDialog from "./LeadEmployeesDialog";
import LeadStatusDialog from "./LeadStatusDialog";
import { formatLeadDate, statusTone, syncLabel, syncTone } from "./leadsUi";

const PAGE_SIZE = 20;

const COURSES = ["Scratch", "Robotics", "Web", "Python"] as const;

type QuickFilter = "all" | LeadStatus | "mine" | "overdue";

function CounterCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-start transition hover:-translate-y-0.5 hover:shadow-sm ${tone} ${
        active ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="text-2xl font-bold">{value.toLocaleString("en-US")}</div>
      <div className="mt-1 text-xs font-medium opacity-80">{label}</div>
    </button>
  );
}

export default function LeadsManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const deferredName = useDeferredValue(name);
  const deferredPhone = useDeferredValue(phone);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mine, setMine] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    lead: {
      id: number;
      fullName: string;
      status: LeadStatus;
      nextFollowUpDate: Date | string | null;
    };
    targetStatus: "needs_follow_up" | "not_interested";
  } | null>(null);
  const [employeesOpen, setEmployeesOpen] = useState(false);
  // Selection is intentionally kept across pages and filter changes. "Select
  // filtered" asks the server for every matching id; the messaging confirmation
  // re-validates eligibility, so a stale selection can never bypass a rule.
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectingFiltered, setSelectingFiltered] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setPage(1);
  }, [
    deferredName,
    deferredPhone,
    statusFilter,
    courseFilter,
    employeeFilter,
    from,
    to,
    mine,
    overdueOnly,
  ]);

  const filters = {
    search: deferredName.trim() || undefined,
    phone: deferredPhone.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    course:
      courseFilter === "all"
        ? undefined
        : (courseFilter as (typeof COURSES)[number]),
    assignedEmployeeId:
      employeeFilter === "all" ? undefined : Number(employeeFilter),
    from: from || undefined,
    to: to || undefined,
    mine: mine || undefined,
    overdueOnly: overdueOnly || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const list = trpc.leads.list.useQuery(filters, {
    retry: false,
    // While a row is waiting on Google Sheets, poll often enough for the badge
    // to flip to "synced" without a manual refresh.
    refetchInterval: query =>
      (query.state.data?.items ?? []).some(
        lead => lead.googleSheetSyncStatus === "pending",
      )
        ? 5_000
        : 30_000,
  });
  const employees = trpc.leads.employees.useQuery(undefined, {
    enabled: Boolean(user?.leadAccess),
    retry: false,
  });
  const syncConfig = trpc.leads.syncConfig.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });

  const statusMutation = trpc.leads.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة العميل");
      utils.leads.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const retrySync = trpc.leads.retrySync.useMutation({
    onSuccess: result => {
      if (result.ok) toast.success("تمت مزامنة العميل");
      else toast.error(result.error || "لم تتم المزامنة");
      utils.leads.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reconcile = trpc.leads.reconcileSync.useMutation({
    onSuccess: result => {
      toast.success(`تمت جدولة ${result.queued} عميلاً للمزامنة`);
      utils.leads.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const counters = list.data?.counters;
  const rows = list.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((list.data?.total ?? 0) / PAGE_SIZE)
  );
  const activeQuick: QuickFilter = overdueOnly
    ? "overdue"
    : mine
      ? "mine"
      : statusFilter === "all"
        ? "all"
        : statusFilter;

  const quickFilters = useMemo(
    () => [
      { key: "all" as const, label: "الكل" },
      ...LEAD_STATUSES.map(value => ({
        key: value,
        label: LEAD_STATUS_SHORT_LABELS[value],
      })),
      { key: "mine" as const, label: "عملائي أنا" },
      { key: "overdue" as const, label: "متأخر في الاتصال" },
    ],
    []
  );

  const applyQuick = (quick: QuickFilter) => {
    setMine(quick === "mine");
    setOverdueOnly(quick === "overdue");
    setStatusFilter(
      quick === "all" || quick === "mine" || quick === "overdue" ? "all" : quick
    );
  };

  const resetFilters = () => {
    setName("");
    setPhone("");
    setStatusFilter("all");
    setCourseFilter("all");
    setEmployeeFilter("all");
    setFrom("");
    setTo("");
    setMine(false);
    setOverdueOnly(false);
    setPage(1);
  };

  const toggleLead = (id: number) => {
    setSelectedLeadIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCurrentPage = (checked: boolean) => {
    setSelectedLeadIds(current => {
      const next = new Set(current);
      for (const lead of rows) {
        if (checked) next.add(lead.id);
        else next.delete(lead.id);
      }
      return next;
    });
  };

  const selectAllFiltered = async () => {
    setSelectingFiltered(true);
    try {
      const result = await utils.messaging.recipients.ids.fetch({
        source: "leads",
        search: deferredName.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        course:
          courseFilter === "all"
            ? undefined
            : (courseFilter as (typeof COURSES)[number]),
        assignedEmployeeId:
          employeeFilter === "all" ? undefined : Number(employeeFilter),
      });
      setSelectedLeadIds(new Set(result.ids));
      toast.success(`تم تحديد ${result.total} عميلاً مطابقاً للفلاتر`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديد النتائج");
    } finally {
      setSelectingFiltered(false);
    }
  };

  const startCampaign = () => {
    if (!selectedLeadIds.size) return;
    setLocation(
      `/messaging?source=leads&ids=${Array.from(selectedLeadIds).join(",")}`,
    );
  };

  const changeStatus = (lead: (typeof rows)[number], value: LeadStatus) => {
    if (value === "needs_follow_up" || value === "not_interested") {
      setStatusDialog({
        lead: {
          id: lead.id,
          fullName: lead.fullName,
          status: lead.status as LeadStatus,
          nextFollowUpDate: lead.nextFollowUpDate,
        },
        targetStatus: value,
      });
      return;
    }
    statusMutation.mutate({
      id: lead.id,
      status: value,
      nextFollowUpDate: null,
    });
  };

  return (
    <div dir="rtl" className="space-y-5 text-start">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Users className="h-4 w-4" />
            متابعة العملاء
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            العملاء المحتملون
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            كل تسجيل من الموقع، مع الحالة والمسؤول والمتابعة القادمة وسجل
            التواصل.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => list.refetch()}
          >
            <RefreshCw
              className={list.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            تحديث
          </Button>
          {isAdmin ? (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setEmployeesOpen(true)}
              >
                <Users className="h-4 w-4" />
                موظفو المتابعة
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => reconcile.mutate()}
                disabled={reconcile.isPending}
              >
                <Settings2
                  className={
                    reconcile.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
                  }
                />
                مزامنة الكل
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {isAdmin && syncConfig.data && !syncConfig.data.configured ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <b>Google Sheets غير مهيأ.</b> التسجيلات تُحفظ في قاعدة البيانات،
              لكن النسخ إلى Sheets لن يعمل حتى تضيف المتغيرات:{" "}
              <span dir="ltr" className="font-mono text-xs">
                {syncConfig.data.missing.join(", ")}
              </span>
              {syncConfig.data.serviceAccountEmail ? (
                <>
                  {" "}
                  — شارك الشيت مع{" "}
                  <span dir="ltr" className="font-mono text-xs">
                    {syncConfig.data.serviceAccountEmail}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin && (counters?.syncFailed ?? 0) > 0 ? (
        <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 sm:flex-row sm:items-center">
          <span>
            <b>{counters?.syncFailed}</b> عميل لم يتم نسخه إلى Google Sheets.
            البيانات محفوظة، لكن النسخة الاحتياطية غير مكتملة.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => reconcile.mutate()}
            disabled={reconcile.isPending}
          >
            <RefreshCw
              className={
                reconcile.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
              }
            />
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <CounterCard
          label="جديد"
          value={counters?.new ?? 0}
          tone="border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200"
          active={activeQuick === "new"}
          onClick={() => applyQuick("new")}
        />
        <CounterCard
          label="يحتاج متابعة"
          value={counters?.needs_follow_up ?? 0}
          tone="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          active={activeQuick === "needs_follow_up"}
          onClick={() => applyQuick("needs_follow_up")}
        />
        <CounterCard
          label="اشترك"
          value={counters?.subscribed ?? 0}
          tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          active={activeQuick === "subscribed"}
          onClick={() => applyQuick("subscribed")}
        />
        <CounterCard
          label="غير راغب"
          value={counters?.not_interested ?? 0}
          tone="border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
          active={activeQuick === "not_interested"}
          onClick={() => applyQuick("not_interested")}
        />
        <CounterCard
          label="متأخر في الاتصال"
          value={counters?.overdue ?? 0}
          tone="border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200"
          active={activeQuick === "overdue"}
          onClick={() => applyQuick("overdue")}
        />
        <CounterCard
          label="إجمالي العملاء"
          value={counters?.total ?? 0}
          tone="border-border bg-muted/40 text-foreground"
          active={activeQuick === "all"}
          onClick={() => applyQuick("all")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {quickFilters.map(filter => (
          <Button
            key={filter.key}
            size="sm"
            variant={activeQuick === filter.key ? "default" : "outline"}
            className="rounded-full"
            onClick={() => applyQuick(filter.key)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card className="rounded-3xl">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label
                htmlFor="lead-search-name"
                className="mb-1.5 block text-xs"
              >
                بحث بالاسم
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                  id="lead-search-name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="اسم العميل…"
                  className="ps-9"
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="lead-search-phone"
                className="mb-1.5 block text-xs"
              >
                بحث برقم الهاتف
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                  id="lead-search-phone"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder="010…"
                  className="ps-9"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">الحالة</Label>
              <Select
                value={statusFilter}
                onValueChange={value =>
                  setStatusFilter(value as LeadStatus | "all")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {LEAD_STATUSES.map(value => (
                    <SelectItem key={value} value={value}>
                      {LEAD_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">الكورس</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الكورسات</SelectItem>
                  {COURSES.map(course => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">الموظف المسؤول</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الموظفين</SelectItem>
                  {(employees.data ?? []).map(employee => (
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
              <Label htmlFor="lead-from" className="mb-1.5 block text-xs">
                تاريخ التسجيل من
              </Label>
              <Input
                id="lead-from"
                type="date"
                value={from}
                onChange={event => setFrom(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lead-to" className="mb-1.5 block text-xs">
                إلى
              </Label>
              <Input
                id="lead-to"
                type="date"
                value={to}
                onChange={event => setTo(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                className="w-full gap-2"
                onClick={resetFilters}
              >
                <X className="h-4 w-4" />
                مسح الفلاتر
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              <SlidersHorizontal className="me-1 inline h-3.5 w-3.5" />
              {list.data?.total ?? 0} عميل مطابق — الأحدث أولاً
            </span>
            <span>حد التنبيه: {list.data?.thresholdHours ?? 24} ساعة</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm">
            <span className="font-semibold">
              المحددون: {selectedLeadIds.size}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={selectingFiltered}
              onClick={selectAllFiltered}
            >
              {selectingFiltered ? "جاري التحديد…" : "تحديد كل النتائج المصفاة"}
            </Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={!selectedLeadIds.size}
              onClick={startCampaign}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              بدء رسالة جماعية
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!selectedLeadIds.size}
              onClick={() => setSelectedLeadIds(new Set())}
            >
              مسح التحديد
            </Button>
            <span className="text-xs text-muted-foreground">
              التحديد يبقى مع تغيير الصفحة والفلاتر، ويُعاد التحقق منه قبل
              الإرسال.
            </span>
          </div>

          {list.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-muted/50"
                />
              ))}
            </div>
          ) : list.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              تعذّر تحميل العملاء. {list.error.message}
              <Button
                variant="outline"
                size="sm"
                className="ms-3"
                onClick={() => list.refetch()}
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">لا يوجد عملاء مطابقون</p>
              <p className="mt-1 text-sm text-muted-foreground">
                جرّب تغيير الفلاتر أو امسح البحث.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <Table className="min-w-[1050px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-start">
                        <Checkbox
                          aria-label="تحديد كل العملاء في الصفحة"
                          checked={
                            rows.length > 0 &&
                            rows.every(lead => selectedLeadIds.has(lead.id))
                          }
                          onCheckedChange={value =>
                            toggleCurrentPage(Boolean(value))
                          }
                        />
                      </TableHead>
                      <TableHead className="text-start">اسم العميل</TableHead>
                      <TableHead className="text-start">رقم الهاتف</TableHead>
                      <TableHead className="text-start">الكورس</TableHead>
                      <TableHead className="text-start">السن</TableHead>
                      <TableHead className="text-start">الحالة</TableHead>
                      <TableHead className="text-start">
                        الموظف المسؤول
                      </TableHead>
                      <TableHead className="text-start">
                        تاريخ التسجيل
                      </TableHead>
                      <TableHead className="text-start">آخر تواصل</TableHead>
                      <TableHead className="text-start">
                        المتابعة القادمة
                      </TableHead>
                      <TableHead className="text-start">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(lead => (
                      <TableRow key={lead.id} className="align-top">
                        <TableCell>
                          <Checkbox
                            aria-label={`تحديد ${lead.fullName}`}
                            checked={selectedLeadIds.has(lead.id)}
                            onCheckedChange={() => toggleLead(lead.id)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="font-semibold">{lead.fullName}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lead.isOverdue ? (
                              <Badge className="border-rose-500/40 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-300">
                                متأخر في الاتصال
                              </Badge>
                            ) : null}
                            {lead.duplicateAttempts > 0 ? (
                              <Badge variant="outline" className="text-[10px]">
                                {lead.duplicateAttempts} محاولة مكررة
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-start">
                          {lead.studentPhone}
                        </TableCell>
                        <TableCell>{lead.course}</TableCell>
                        <TableCell>{lead.age}</TableCell>
                        <TableCell>
                          <Select
                            value={lead.status}
                            onValueChange={value =>
                              changeStatus(lead, value as LeadStatus)
                            }
                            disabled={statusMutation.isPending}
                          >
                            <SelectTrigger
                              className={`h-8 w-[170px] border text-xs ${statusTone(lead.status)}`}
                              aria-label={`حالة ${lead.fullName}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_STATUSES.map(value => (
                                <SelectItem key={value} value={value}>
                                  {LEAD_STATUS_LABELS[value]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="whitespace-normal text-sm">
                          {lead.assignedEmployeeName ?? "غير مسند"}
                        </TableCell>
                        <TableCell className="whitespace-normal text-xs">
                          {formatLeadDate(lead.registrationDate)}
                        </TableCell>
                        <TableCell className="whitespace-normal text-xs">
                          {formatLeadDate(lead.lastContactDate)}
                        </TableCell>
                        <TableCell className="whitespace-normal text-xs">
                          {formatLeadDate(lead.nextFollowUpDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => setSelectedLeadId(lead.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              التفاصيل
                            </Button>
                            {user?.canConvertLeads &&
                            !lead.convertedStudentId ? (
                              <Button
                                size="icon-sm"
                                variant="outline"
                                aria-label={`تحويل ${lead.fullName} إلى طالب`}
                                title="تحويل إلى طالب"
                                onClick={() => setSelectedLeadId(lead.id)}
                              >
                                <UserRoundCheck className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                            <button
                              type="button"
                              title={
                                lead.googleSheetSyncError ??
                                syncLabel(lead.googleSheetSyncStatus)
                              }
                              onClick={() => retrySync.mutate({ id: lead.id })}
                              className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${syncTone(
                                lead.googleSheetSyncStatus
                              )}`}
                            >
                              {syncLabel(lead.googleSheetSyncStatus)}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 lg:hidden">
                {rows.map(lead => (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-border/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          className="mt-1"
                          aria-label={`تحديد ${lead.fullName}`}
                          checked={selectedLeadIds.has(lead.id)}
                          onCheckedChange={() => toggleLead(lead.id)}
                        />
                        <div>
                          <div className="font-semibold">{lead.fullName}</div>
                          <div
                            className="mt-0.5 text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {lead.studentPhone}
                          </div>
                        </div>
                      </div>
                      <Badge className={statusTone(lead.status)}>
                        {LEAD_STATUS_LABELS[lead.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary">{lead.course}</Badge>
                      <Badge variant="outline">{lead.age} سنة</Badge>
                      {lead.isOverdue ? (
                        <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                          متأخر في الاتصال
                        </Badge>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => retrySync.mutate({ id: lead.id })}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${syncTone(
                          lead.googleSheetSyncStatus
                        )}`}
                      >
                        {syncLabel(lead.googleSheetSyncStatus)}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>
                        المسؤول: {lead.assignedEmployeeName ?? "غير مسند"}
                      </span>
                      <span>
                        التسجيل: {formatLeadDate(lead.registrationDate)}
                      </span>
                      <span>
                        آخر تواصل: {formatLeadDate(lead.lastContactDate)}
                      </span>
                      <span>
                        المتابعة: {formatLeadDate(lead.nextFollowUpDate)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Select
                        value={lead.status}
                        onValueChange={value =>
                          changeStatus(lead, value as LeadStatus)
                        }
                        disabled={statusMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map(value => (
                            <SelectItem key={value} value={value}>
                              {LEAD_STATUS_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        التفاصيل
                      </Button>
                      {user?.canConvertLeads && !lead.convertedStudentId ? (
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                          <UserRoundCheck className="h-3.5 w-3.5" />
                          تحويل إلى طالب
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground">
              صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(current => Math.max(1, current - 1))}
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage(current => Math.min(totalPages, current + 1))
                }
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <LeadDetailsSheet
        leadId={selectedLeadId}
        open={selectedLeadId != null}
        onOpenChange={next => {
          if (!next) setSelectedLeadId(null);
        }}
      />

      {statusDialog ? (
        <LeadStatusDialog
          open
          onOpenChange={next => {
            if (!next) setStatusDialog(null);
          }}
          lead={statusDialog.lead}
          targetStatus={statusDialog.targetStatus}
          onDone={() => setStatusDialog(null)}
        />
      ) : null}

      {isAdmin ? (
        <LeadEmployeesDialog
          open={employeesOpen}
          onOpenChange={setEmployeesOpen}
        />
      ) : null}
    </div>
  );
}
