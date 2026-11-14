import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  DatabaseBackup,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import AchievementsManager from "@/components/AchievementsManager";
import AdminGate from "@/components/AdminGate";
import AdminAnalytics from "@/components/performance/AdminAnalytics";
import AnnouncementManager from "@/components/AnnouncementManager";
import AccountsManager from "@/components/accounts/AccountsManager";
import BackupManager from "@/components/BackupManager";
import CoursesManager from "@/components/CoursesManager";
import DashboardLayout from "@/components/DashboardLayout";
import InstructorsManager from "@/components/InstructorsManager";
import LeadsManager from "@/components/leads/LeadsManager";
import MessagingManager from "@/components/messaging/MessagingManager";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { useLocation, useSearchParams } from "wouter";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { PHONE_VALIDATION_MESSAGE, validatePhone } from "@shared/validation";
import "@/styles/admin.css";

/** Admin phone fields accept digits only; letters and punctuation never reach
 *  the form state (the shared validator still decides whether the number is a
 *  real Egyptian mobile/landline). Capped so a pasted +20 value fits too. */
function digitsOnly(value: string, maxLength = 13): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

type Course = "Scratch" | "Robotics" | "Web" | "Python";
type StudentStatus = "active" | "paused";
type AdminTab =
  | "overview"
  | "analytics"
  | "students"
  | "instructors"
  | "schedule"
  | "courses"
  | "leads"
  | "messaging"
  | "accounts"
  | "achievements"
  | "announcements"
  | "backup"
  | "admins";

const COURSES: Course[] = ["Scratch", "Robotics", "Web", "Python"];
const ADMIN_TABS: AdminTab[] = [
  "overview",
  "analytics",
  "students",
  "instructors",
  "schedule",
  "courses",
  "leads",
  "messaging",
  "accounts",
  "achievements",
  "announcements",
  "backup",
  "admins",
];

const COURSE_LABELS: Record<Course, string> = {
  Scratch: "سكراتش",
  Robotics: "الروبوتات",
  Web: "تطوير الويب",
  Python: "بايثون",
};

const COURSE_STATUS_LABELS: Record<string, string> = {
  live: "متاح",
  coming_soon: "قريباً",
  waiting_list: "قائمة انتظار",
};

const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "نشط",
  paused: "موقوف",
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(date);
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
  tone: "navy" | "graphite" | "mist" | "azure";
}) {
  return (
    <Card className="admin-kpi">
      <div className="admin-kpi-top">
        <span className={`admin-kpi-icon admin-tone-${tone}`}>
          <Icon />
        </span>
        {hint ? <span className="admin-kpi-hint">{hint}</span> : null}
      </div>
      <div className="admin-kpi-value admin-number">{value}</div>
      <div className="admin-kpi-label">{label}</div>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
        <span>{label}</span>
        {hint ? <span className="text-[11px] font-normal text-muted-foreground">{hint}</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="admin-empty">
      {text}
    </div>
  );
}

export default function Admin() {
  useDocumentLocale("ar", "rtl");
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const isOwner = user?.isOwner === true;
  const [, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: AdminTab =
    ADMIN_TABS.includes(requested as AdminTab) &&
    (requested !== "admins" || isOwner)
      ? (requested as AdminTab)
      : "overview";
  const setTab = (next: AdminTab) =>
    setLocation(next === "overview" ? "/admin" : `/admin?tab=${next}`);

  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    phone: "",
    groupId: "",
    status: "active" as StudentStatus,
    courses: ["Python"] as Course[],
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectingStudents, setSelectingStudents] = useState(false);

  const stats = trpc.admin.stats.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const courseOfferings = trpc.admin.courseOfferings.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const students = trpc.admin.students.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const groups = trpc.admin.groups.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const admins = trpc.admin.admins.useQuery(undefined, {
    retry: false,
    enabled: isOwner,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const requests = trpc.admin.accessRequests.useQuery(undefined, {
    retry: false,
    enabled: isOwner,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const utils = trpc.useUtils();
  const [adminEmail, setAdminEmail] = useState("");
  const invalidateAdminLists = () => {
    utils.admin.admins.invalidate();
    utils.admin.accessRequests.invalidate();
  };
  const addAdmin = trpc.admin.addAdmin.useMutation({
    onSuccess: () => {
      toast.success("تم منح صلاحية الإدارة");
      setAdminEmail("");
      invalidateAdminLists();
    },
    onError: e => toast.error(e.message),
  });
  const removeAdmin = trpc.admin.removeAdmin.useMutation({
    onSuccess: () => {
      toast.success("تم سحب صلاحية الإدارة");
      invalidateAdminLists();
    },
    onError: e => toast.error(e.message),
  });
  const approveAccess = trpc.admin.approveAccess.useMutation({
    onSuccess: () => {
      toast.success("تمت الموافقة على الوصول");
      invalidateAdminLists();
    },
    onError: e => toast.error(e.message),
  });
  const dismissAccess = trpc.admin.dismissAccess.useMutation({
    onSuccess: () => {
      toast.success("تم رفض الطلب");
      invalidateAdminLists();
    },
    onError: e => toast.error(e.message),
  });

  const resetStudent = () => {
    setStudentId(null);
    setStudentForm({
      name: "",
      email: "",
      phone: "",
      groupId: "",
      status: "active",
      courses: ["Python"],
    });
  };
  const createStudent = trpc.admin.createStudent.useMutation({
    onSuccess: data => {
      toast.success(`تم إنشاء الطالب — كود الدخول: ${data.accessCode}`);
      resetStudent();
      utils.admin.students.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const updateStudent = trpc.admin.updateStudent.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات الطالب");
      resetStudent();
      utils.admin.students.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const deleteStudent = trpc.admin.deleteStudent.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الطالب");
      utils.admin.students.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const toggleCourse = (course: Course) =>
    setStudentForm(current => ({
      ...current,
      courses: current.courses.includes(course)
        ? current.courses.filter(item => item !== course)
        : [...current.courses, course],
    }));
  const startStudentEdit = (student: any) => {
    setStudentId(student.id);
    setStudentForm({
      name: student.name,
      email: student.email || "",
      phone: student.phone || "",
      groupId: student.groupId ? String(student.groupId) : "",
      status: student.status,
      courses: student.courses?.length ? student.courses : ["Python"],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleStudent = (id: number) =>
    setSelectedStudentIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAllStudents = async () => {
    setSelectingStudents(true);
    try {
      const result = await utils.messaging.recipients.ids.fetch({
        source: "students",
      });
      setSelectedStudentIds(new Set(result.ids));
      toast.success(`تم تحديد ${result.total} طالباً`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديد الطلاب");
    } finally {
      setSelectingStudents(false);
    }
  };
  const startStudentCampaign = () => {
    if (!selectedStudentIds.size) return;
    setLocation(
      `/messaging?source=students&ids=${Array.from(selectedStudentIds).join(",")}`,
    );
  };

  const offeringByCourse = new Map(
    (courseOfferings.data ?? []).map(item => [item.course, item.status]),
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    const rows = students.data ?? [];
    if (!term) return rows;
    return rows.filter(
      (student: any) =>
        student.name?.toLowerCase().includes(term) ||
        student.phone?.includes(term) ||
        student.accessCode?.toLowerCase().includes(term),
    );
  }, [students.data, studentSearch]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">جارٍ تحميل مساحة العمل…</p>
      </div>
    );
  }
  if (!isAdmin) return <AdminGate />;

  return (
    <DashboardLayout activeTab={tab}>
      {tab === "overview" && (
        <div className="space-y-5">
          <section className="admin-hero">
            <div className="relative">
              <span className="admin-hero-kicker">
                <Sparkles className="h-3.5 w-3.5" />
                Academy OS · مساحة العمل
              </span>
              <h2>أهلاً بك، {user?.name || "مدير الأكاديمية"}</h2>
              <p>
                نظرة سريعة على الطلاب والعملاء والمهام اليومية. كل ما تحتاجه
                لإدارة الأكاديمية من مكان واحد.
              </p>
              <div className="admin-hero-actions">
                <Button className="gap-2" onClick={() => setTab("students")}>
                  <Plus className="h-4 w-4" />
                  إضافة طالب
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setTab("leads")}
                >
                  <ClipboardList className="h-4 w-4" />
                  متابعة العملاء
                </Button>
              </div>
            </div>
            <div className="admin-hero-aside">
              <div className="admin-hero-stat">
                <span>عملاء جدد</span>
                <b className="admin-number">{stats.data?.newLeads ?? 0}</b>
              </div>
              <div className="admin-hero-stat">
                <span>مجموعات نشطة</span>
                <b className="admin-number">{stats.data?.groups ?? 0}</b>
              </div>
              <div className="admin-hero-stat">
                <span>طلاب نشطون</span>
                <b className="admin-number">{stats.data?.active ?? 0}</b>
              </div>
            </div>
          </section>

          {(stats.data?.registrationPending ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => setTab("leads")}
              className="admin-attention"
            >
              <span>
                {stats.data?.newLeads ?? 0} عميل جديد بانتظار المتابعة
                {(stats.data?.overdueLeads ?? 0) > 0
                  ? ` — ${stats.data?.overdueLeads} متأخر في الاتصال`
                  : ""}
              </span>
              <span className="admin-attention-pill">مراجعة</span>
            </button>
          ) : null}

          <div className="admin-kpi-grid">
            <StatCard
              icon={Users}
              label="إجمالي الطلاب"
              value={stats.data?.students ?? "—"}
              hint="كل الطلاب المسجلين"
              tone="navy"
            />
            <StatCard
              icon={CalendarDays}
              label="المجموعات النشطة"
              value={stats.data?.groups ?? "—"}
              hint="مجموعات الجدول"
              tone="graphite"
            />
            <StatCard
              icon={BarChart3}
              label="الطلاب النشطون"
              value={stats.data?.active ?? "—"}
              hint="حسابات مفتوحة"
              tone="mist"
            />
            <StatCard
              icon={ClipboardList}
              label="عملاء جدد"
              value={stats.data?.newLeads ?? 0}
              hint="بانتظار المتابعة"
              tone="azure"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <Card className="admin-panel">
              <CardHeader className="admin-panel-head">
                <div>
                  <span className="admin-kicker">Live status</span>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    حالة الكورسات
                  </CardTitle>
                </div>
                <Badge variant="outline">٤ كورسات</Badge>
              </CardHeader>
              <CardContent className="admin-course-list">
                {COURSES.map(course => {
                  const status = offeringByCourse.get(course) ?? "coming_soon";
                  return (
                    <div key={course} className="admin-course-row">
                      <span className="admin-course-dot" data-status={status} />
                      <div className="min-w-0">
                        <div className="admin-course-name">{COURSE_LABELS[course]}</div>
                        <div className="admin-course-meta">
                          {status === "live"
                            ? "متاح للحجز على الموقع"
                            : status === "waiting_list"
                              ? "قائمة انتظار مفعّلة"
                              : "يظهر للزوار كقريباً"}
                        </div>
                      </div>
                      <span className="admin-course-track">
                        <i data-status={status} />
                      </span>
                      <Badge
                        variant={status === "live" ? "default" : "secondary"}
                        className="rounded-full"
                      >
                        {COURSE_STATUS_LABELS[status] ?? "غير محدد"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="admin-panel">
              <CardHeader className="admin-panel-head">
                <div>
                  <span className="admin-kicker">Shortcuts</span>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-primary" />
                    إجراءات سريعة
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="admin-quick-grid">
                {[
                  { label: "إضافة طالب جديد", tab: "students" as const, icon: UserPlus },
                  { label: "فتح جدول الحصص", tab: "schedule" as const, icon: CalendarClock },
                  { label: "نشر إنجاز", tab: "achievements" as const, icon: Trophy },
                  { label: "إعلان للموقع", tab: "announcements" as const, icon: Megaphone },
                  { label: "نسخة Excel احتياطية", tab: "backup" as const, icon: DatabaseBackup },
                  { label: "الحسابات والمدفوعات", tab: "accounts" as const, icon: Wallet },
                  { label: "المراسلة الجماعية", tab: "messaging" as const, icon: MessageSquare },
                ].map(action => (
                  <button
                    key={action.tab + action.label}
                    type="button"
                    onClick={() => setTab(action.tab)}
                    className="admin-quick-item"
                  >
                    <span className="admin-quick-icon">
                      <action.icon />
                    </span>
                    <span>{action.label}</span>
                    <span className="admin-quick-arrow">←</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="grid gap-6 xl:grid-cols-[370px_1fr]">
          <Card className="admin-card h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {studentId ? "تعديل بيانات طالب" : "إضافة طالب جديد"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Field label="الاسم الكامل">
                  <Input
                    value={studentForm.name}
                    onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                    placeholder="مثال: لينا أحمد"
                  />
                </Field>
                <Field label="البريد الإلكتروني" hint="اختياري">
                  <Input
                    type="email"
                    value={studentForm.email}
                    onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                    placeholder="parent@example.com"
                    dir="ltr"
                  />
                </Field>
                <Field label="رقم الهاتف" hint="أرقام فقط">
                  <Input
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
                    value={studentForm.phone}
                    onChange={e =>
                      setStudentForm({
                        ...studentForm,
                        phone: digitsOnly(e.target.value),
                      })
                    }
                    placeholder="01012345678"
                    dir="ltr"
                    aria-invalid={
                      studentForm.phone.length > 0 &&
                      !validatePhone(studentForm.phone).ok
                    }
                  />
                  {studentForm.phone.length > 0 &&
                  !validatePhone(studentForm.phone).ok ? (
                    <p className="mt-1.5 text-xs text-destructive">
                      {PHONE_VALIDATION_MESSAGE}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      يقبل الأرقام فقط — مثال: 01012345678
                    </p>
                  )}
                </Field>
                <Field label="المجموعة">
                  <Select
                    value={studentForm.groupId || "none"}
                    onValueChange={value =>
                      setStudentForm({
                        ...studentForm,
                        groupId: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المجموعة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مجموعة</SelectItem>
                      {groups.data?.map(group => (
                        <SelectItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {studentId ? (
                  <Field label="حالة الطالب">
                    <Select
                      value={studentForm.status}
                      onValueChange={value =>
                        setStudentForm({
                          ...studentForm,
                          status: value as StudentStatus,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="paused">موقوف</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
                <div>
                  <Label className="mb-3 block text-sm font-semibold">الكورسات</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {COURSES.map(course => (
                      <label
                        key={course}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-background/50 p-3 text-sm transition hover:border-primary/30"
                      >
                        <Checkbox
                          checked={studentForm.courses.includes(course)}
                          onCheckedChange={() => toggleCourse(course)}
                        />
                        {COURSE_LABELS[course]}
                      </label>
                    ))}
                  </div>
                </div>
                <Button
                  className="h-11 w-full rounded-xl"
                  disabled={
                    !studentForm.name ||
                    !validatePhone(studentForm.phone).ok ||
                    !studentForm.courses.length ||
                    createStudent.isPending ||
                    updateStudent.isPending
                  }
                  onClick={() =>
                    studentId
                      ? updateStudent.mutate({
                          id: studentId,
                          ...studentForm,
                          groupId: studentForm.groupId
                            ? Number(studentForm.groupId)
                            : null,
                          courses: studentForm.courses,
                        })
                      : createStudent.mutate({
                          ...studentForm,
                          groupId: studentForm.groupId
                            ? Number(studentForm.groupId)
                            : null,
                          courses: studentForm.courses,
                        })
                  }
                >
                  {createStudent.isPending || updateStudent.isPending
                    ? "جارٍ الحفظ…"
                    : studentId
                      ? "حفظ التعديلات"
                      : "إنشاء الطالب"}
                </Button>
                {studentId ? (
                  <Button variant="ghost" className="w-full" onClick={resetStudent}>
                    إلغاء التعديل
                  </Button>
                ) : null}
                <p className="text-[11px] leading-6 text-muted-foreground">
                  يتم إنشاء كود الدخول تلقائياً ولا يُكتب يدوياً.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card min-w-0">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  الطلاب <span className="text-muted-foreground">({students.data?.length ?? 0})</span>
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="بحث بالاسم أو الهاتف أو الكود"
                    className="ps-9"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-2.5 text-xs">
                <span className="font-bold">المحددون: {selectedStudentIds.size}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectingStudents}
                  onClick={selectAllStudents}
                >
                  {selectingStudents ? "جارٍ التحديد…" : "تحديد كل الطلاب"}
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={!selectedStudentIds.size}
                  onClick={startStudentCampaign}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  رسالة جماعية
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!selectedStudentIds.size}
                  onClick={() => setSelectedStudentIds(new Set())}
                >
                  مسح التحديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {students.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-muted/50" />
                  ))}
                </div>
              ) : !filteredStudents.length ? (
                <Empty text="لا يوجد طلاب مطابقون. أضف أول طالب من النموذج." />
              ) : (
                <div className="admin-table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label="تحديد كل الطلاب المعروضين"
                            checked={
                              filteredStudents.length > 0 &&
                              filteredStudents.every((student: any) =>
                                selectedStudentIds.has(student.id),
                              )
                            }
                            onCheckedChange={value =>
                              setSelectedStudentIds(current => {
                                const next = new Set(current);
                                for (const student of filteredStudents) {
                                  if (value) next.add(student.id);
                                  else next.delete(student.id);
                                }
                                return next;
                              })
                            }
                          />
                        </TableHead>
                        <TableHead>الطالب</TableHead>
                        <TableHead>المجموعة</TableHead>
                        <TableHead>الكورسات</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>كود الدخول</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student: any) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              aria-label={`تحديد ${student.name}`}
                              checked={selectedStudentIds.has(student.id)}
                              onCheckedChange={() => toggleStudent(student.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {student.name?.charAt(0) || "ط"}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{student.name}</div>
                                <div className="mt-0.5 text-[11px] text-muted-foreground" dir="ltr">
                                  {student.phone || "—"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{student.group?.name || "بدون مجموعة"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {student.courses?.map((course: Course) => (
                                <Badge key={course} variant="secondary" className="rounded-full text-[10px]">
                                  {COURSE_LABELS[course] ?? course}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                student.status === "active"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                              }
                            >
                              {STUDENT_STATUS_LABELS[student.status as StudentStatus] ?? student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <code className="rounded-lg bg-primary/8 px-2 py-1 text-[11px] font-bold text-primary" dir="ltr">
                                {student.accessCode}
                              </code>
                              <button
                                type="button"
                                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="نسخ كود الدخول"
                                onClick={() => {
                                  navigator.clipboard.writeText(student.accessCode);
                                  toast.success("تم نسخ كود الدخول");
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => startStudentEdit(student)}>
                                تعديل
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                aria-label={`حذف ${student.name}`}
                                onClick={() => {
                                  if (window.confirm(`هل تريد حذف ${student.name}؟`)) {
                                    deleteStudent.mutate({ id: student.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "instructors" && <InstructorsManager />}
      {tab === "schedule" && <ScheduleCalendar />}
      {tab === "courses" && <CoursesManager />}
      {tab === "leads" && <LeadsManager />}
      {tab === "messaging" && <MessagingManager />}
      {tab === "accounts" && <AccountsManager />}
      {tab === "analytics" && <AdminAnalytics />}
      {tab === "achievements" && <AchievementsManager />}
      {tab === "announcements" && <AnnouncementManager />}
      {tab === "backup" && <BackupManager />}

      {tab === "admins" && isOwner && (
        <div className="space-y-6">
          <Card className="admin-card border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                طلبات الوصول
                {requests.data?.length ? (
                  <Badge variant="secondary">{requests.data.length}</Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.data?.length ? (
                <div className="space-y-3">
                  {requests.data.map(request => (
                    <div
                      key={request.id}
                      className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold" dir="ltr">{request.email}</div>
                        {request.name ? (
                          <div className="mt-0.5 text-sm text-muted-foreground">{request.name}</div>
                        ) : null}
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          طلب في {formatDate(request.createdAt)}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          className="rounded-xl"
                          disabled={approveAccess.isPending}
                          onClick={() => approveAccess.mutate({ email: request.email })}
                        >
                          موافقة
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          disabled={dismissAccess.isPending}
                          onClick={() => dismissAccess.mutate({ email: request.email })}
                        >
                          رفض
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="لا توجد طلبات وصول جديدة حالياً." />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[370px_1fr]">
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="text-base">إضافة مشرف مباشرة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="البريد الإلكتروني">
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="teacher@example.com"
                    dir="ltr"
                  />
                </Field>
                <Button
                  className="h-11 w-full rounded-xl"
                  disabled={!adminEmail.trim() || addAdmin.isPending}
                  onClick={() => addAdmin.mutate({ email: adminEmail.trim() })}
                >
                  {addAdmin.isPending ? "جارٍ المنح…" : "منح صلاحية الإدارة"}
                </Button>
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="text-base">من يستطيع فتح لوحة الإدارة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {admins.data?.length ? (
                    admins.data.map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/50 p-3.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold" dir="ltr">{entry.email}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {entry.locked
                              ? "مثبّت في ADMIN_EMAILS"
                              : entry.invitedBy
                                ? `دعوة من ${entry.invitedBy}`
                                : "مدعو"}
                          </div>
                        </div>
                        {entry.locked ? (
                          <Badge variant="secondary">المالك</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            disabled={removeAdmin.isPending}
                            aria-label={`سحب صلاحية ${entry.email}`}
                            onClick={() => {
                              if (window.confirm(`سحب صلاحية الإدارة من ${entry.email}؟`)) {
                                removeAdmin.mutate({ email: entry.email });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <Empty text="لا أحد يملك صلاحية الوصول بعد." />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
