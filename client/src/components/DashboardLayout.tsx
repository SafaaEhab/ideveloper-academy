import { useAuth } from "@/_core/hooks/useAuth";
import AcademyLogo from "@/components/AcademyLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  DatabaseBackup,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Moon,
  PanelRightClose,
  ShieldCheck,
  Sun,
  Trophy,
  Users,
  Wallet,
  Layers,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  tab: string;
  short: string;
  ownerOnly?: boolean;
  permission?: "messaging" | "accounts";
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "نظرة عامة",
    items: [
      { icon: LayoutDashboard, label: "لوحة التحكم", short: "لوحة التحكم", tab: "overview" },
      { icon: BarChart3, label: "تحليل الأداء", short: "الأداء", tab: "analytics" },
    ],
  },
  {
    label: "الأكاديمية",
    items: [
      { icon: Users, label: "الطلاب", short: "الطلاب", tab: "students" },
      { icon: GraduationCap, label: "المدربون", short: "المدربون", tab: "instructors" },
      { icon: CalendarClock, label: "جدول الحصص", short: "الجدول", tab: "schedule" },
      { icon: Layers, label: "الكورسات", short: "الكورسات", tab: "courses" },
    ],
  },
  {
    label: "النمو والتواصل",
    items: [
      { icon: ClipboardList, label: "العملاء المحتملون", short: "العملاء", tab: "leads" },
      {
        icon: MessageSquare,
        label: "المراسلة",
        short: "المراسلة",
        tab: "messaging",
        permission: "messaging",
      },
    ],
  },
  {
    label: "المالية",
    items: [
      {
        icon: Wallet,
        label: "الحسابات والمدفوعات",
        short: "الحسابات",
        tab: "accounts",
        permission: "accounts",
      },
    ],
  },
  {
    label: "المحتوى",
    items: [
      { icon: Trophy, label: "الإنجازات", short: "الإنجازات", tab: "achievements" },
      { icon: Megaphone, label: "إعلان الموقع", short: "الإعلان", tab: "announcements" },
    ],
  },
  {
    label: "النظام",
    items: [
      { icon: DatabaseBackup, label: "النسخ الاحتياطي", short: "النسخ", tab: "backup" },
      {
        icon: ShieldCheck,
        label: "المشرفون وصلاحيات الوصول",
        short: "المشرفون",
        tab: "admins",
        ownerOnly: true,
      },
    ],
  },
];

export const ADMIN_PAGE_META: Record<
  string,
  { title: string; description: string }
> = {
  overview: {
    title: "لوحة التحكم",
    description: "ملخص سريع لأداء الأكاديمية والمهام اليومية.",
  },
  analytics: {
    title: "تحليل الأداء",
    description: "متابعة الحضور والواجبات وتقدم الطلاب.",
  },
  students: {
    title: "الطلاب",
    description: "إدارة ملفات الطلاب والكورسات والمجموعات وأكواد الدخول.",
  },
  instructors: {
    title: "المدربون",
    description: "إدارة حسابات المدربين والجداول المسندة إليهم.",
  },
  schedule: {
    title: "جدول الحصص",
    description: "تنظيم المواعيد الأسبوعية والمجموعات والاستثناءات.",
  },
  courses: {
    title: "الكورسات",
    description: "التحكم في حالة كل كورس على الموقع العام.",
  },
  leads: {
    title: "العملاء المحتملون",
    description: "متابعة التسجيلات الجديدة وتحويلها إلى طلاب.",
  },
  messaging: {
    title: "المراسلة",
    description: "حملات واتساب والقوالب وسجل الإرسال.",
  },
  accounts: {
    title: "الحسابات والمدفوعات",
    description: "الاشتراكات والمدفوعات والتذكيرات والمصروفات والتقارير.",
  },
  achievements: {
    title: "الإنجازات",
    description: "إدارة الإنجازات المعروضة على الصفحة الرئيسية.",
  },
  announcements: {
    title: "إعلان الموقع",
    description: "التحكم في الإعلان المنبثق للزوار.",
  },
  backup: {
    title: "النسخ الاحتياطي",
    description: "تنزيل نسخة Excel كاملة من بيانات الأكاديمية.",
  },
  admins: {
    title: "المشرفون وصلاحيات الوصول",
    description: "إدارة من يستطيع فتح لوحة الإدارة وطلبات الوصول.",
  },
};

const SIDEBAR_WIDTH = "282px";

export default function DashboardLayout({
  children,
  activeTab: activeTabProp,
}: {
  children: React.ReactNode;
  /** The tab actually rendered; falls back to the query string. */
  activeTab?: string;
}) {
  useDocumentLocale("ar", "rtl");
  const { loading, user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = activeTabProp ?? searchParams.get("tab") ?? "overview";
  const meta = ADMIN_PAGE_META[activeTab] ?? ADMIN_PAGE_META.overview;

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-background p-6" dir="rtl">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <AcademyLogo className="h-16 w-16" />
          <div>
            <h1 className="text-2xl font-bold">سجّل الدخول للمتابعة</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              لوحة الإدارة متاحة للحسابات المصرح لها فقط.
            </p>
          </div>
          <Button onClick={() => startLogin()} size="lg" className="w-full rounded-2xl">
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": SIDEBAR_WIDTH } as React.CSSProperties}
    >
      <div dir="rtl" className="admin-shell flex min-h-screen w-full bg-background">
        <DashboardLayoutContent activeTab={activeTab} meta={meta}>
          {children}
        </DashboardLayoutContent>
      </div>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  activeTab,
  meta,
}: {
  children: React.ReactNode;
  activeTab: string;
  meta: { title: string; description: string };
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    );
  }, []);

  const visibleGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.ownerOnly === true && user?.isOwner !== true) return false;
      if (item.permission === "messaging" && !user?.phase2?.messaging) return false;
      if (
        item.permission === "accounts" &&
        !(
          user?.phase2?.reports ||
          user?.phase2?.payments ||
          user?.phase2?.subscriptions ||
          user?.phase2?.expenses ||
          user?.phase2?.financeSettings
        )
      ) {
        return false;
      }
      return true;
    }),
  })).filter(group => group.items.length > 0);

  const navigate = (tab: string) =>
    setLocation(tab === "overview" ? "/admin" : `/admin?tab=${tab}`);

  return (
    <>
      <Sidebar
        side="right"
        collapsible="icon"
        className="admin-sidebar border-none p-2 md:p-3"
      >
        <div className="admin-sidebar-panel flex h-full flex-col overflow-hidden rounded-[1.6rem]">
          <SidebarHeader className="border-b border-white/10 px-4 py-5">
            <div className="flex items-center gap-3">
              <AcademyLogo className="h-11 w-11 shrink-0 ring-2 ring-white/10" />
              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-extrabold text-white">
                    iDeveloper
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-white/55">
                    لوحة إدارة الأكاديمية
                  </div>
                </div>
              ) : null}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                  aria-label="طي القائمة الجانبية"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="admin-sidebar-scroll px-2 py-3">
            {visibleGroups.map(group => (
              <SidebarGroup key={group.label} className="py-1">
                {!isCollapsed ? (
                  <SidebarGroupLabel className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/35">
                    {group.label}
                  </SidebarGroupLabel>
                ) : null}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {group.items.map(item => {
                      const isActive =
                        location === "/admin" && item.tab === activeTab;
                      return (
                        <SidebarMenuItem key={item.tab}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => navigate(item.tab)}
                            tooltip={item.label}
                            className={`group h-10 rounded-xl px-3 text-[13px] font-medium transition ${
                              isActive
                                ? "bg-white text-slate-900 shadow-lg shadow-black/20 hover:bg-white"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <item.icon
                              className={`h-[18px] w-[18px] shrink-0 ${
                                isActive ? "text-primary" : "text-white/45 group-hover:text-white/80"
                              }`}
                            />
                            {!isCollapsed ? <span>{item.label}</span> : null}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-white/10 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl bg-white/[.06] p-2.5 text-start transition hover:bg-white/10 ${
                    isCollapsed ? "justify-center" : ""
                  }`}
                >
                  <Avatar className="h-9 w-9 shrink-0 border border-white/15">
                    <AvatarFallback className="bg-white/10 text-xs font-bold text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || "أ"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {user?.name || "مستخدم"}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-white/45" dir="ltr">
                        {user?.email || "-"}
                      </p>
                    </div>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-2xl">
                <DropdownMenuLabel className="text-right">
                  {user?.name || "حسابي"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </div>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-transparent">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
          <div className="flex min-h-[74px] items-center justify-between gap-3 px-4 py-3 md:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {isMobile ? (
                <SidebarTrigger className="h-9 w-9 rounded-xl border border-border bg-card" />
              ) : null}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span>لوحة الإدارة</span>
                  <span className="text-border">/</span>
                  <span className="text-primary">{meta.title}</span>
                </div>
                <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight md:text-2xl">
                  {meta.title}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
              {today ? (
                <span className="hidden rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] text-muted-foreground lg:inline-flex">
                  {today}
                </span>
              ) : null}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden rounded-xl sm:inline-flex"
              >
                <Link href="/">
                  <ExternalLink className="me-1.5 h-3.5 w-3.5" />
                  زيارة الموقع
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <div className="hidden items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="max-w-[150px] truncate text-xs font-semibold">
                  {user?.name || user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="admin-content flex-1 px-4 py-5 md:px-6 md:py-6 xl:px-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}
