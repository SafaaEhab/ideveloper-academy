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

const SIDEBAR_WIDTH = "292px";

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
      <div className="admin-app flex min-h-screen items-center justify-center bg-background p-6" dir="rtl">
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
      <div dir="rtl" className="admin-app admin-frame flex min-h-screen w-full">
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
        className="admin-rail border-none p-2 md:p-3"
      >
        <div className="admin-rail-panel">
          <SidebarHeader className="admin-brand">
            <div className="flex items-center gap-3">
              <span className="admin-brand-logo">
                <AcademyLogo className="h-10 w-10" />
              </span>
              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <div className="admin-brand-name">iDeveloper</div>
                  <div className="admin-brand-kicker">Academy OS</div>
                </div>
              ) : null}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="admin-rail-collapse"
                  aria-label="طي القائمة الجانبية"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="admin-sidebar-scroll admin-nav px-2 py-2">
            {visibleGroups.map(group => (
              <SidebarGroup key={group.label} className="admin-nav-group py-1">
                {!isCollapsed ? (
                  <SidebarGroupLabel className="admin-nav-label">
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
                            className="group"
                          >
                            <item.icon className="shrink-0" />
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

          <SidebarFooter className="admin-rail-footer">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`admin-user-card ${
                    isCollapsed ? "justify-center" : ""
                  }`}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {user?.name?.charAt(0)?.toUpperCase() || "أ"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed ? (
                    <div className="min-w-0 flex-1">
                      <p className="admin-user-name truncate">
                        {user?.name || "مستخدم"}
                      </p>
                      <p className="admin-user-email truncate" dir="ltr">
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

      <SidebarInset className="admin-inset min-w-0 bg-transparent">
        <header className="admin-topbar">
          <div className="admin-topbar-inner">
            <div className="flex min-w-0 items-center gap-3">
              {isMobile ? (
                <SidebarTrigger className="admin-icon-btn h-9 w-9" />
              ) : null}
              <div className="min-w-0">
                <div className="admin-crumb">
                  <span>لوحة الإدارة</span>
                  <span className="admin-crumb-sep">/</span>
                  <span className="admin-crumb-current">{meta.title}</span>
                </div>
                <h1 className="admin-title truncate">{meta.title}</h1>
                <p className="admin-subtitle">{meta.description}</p>
              </div>
            </div>
            <div className="admin-topbar-actions">
              {today ? (
                <span className="admin-date-chip">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {today}
                </span>
              ) : null}
              <Button asChild variant="outline" size="sm" className="admin-visit hidden rounded-xl sm:inline-flex">
                <Link href="/">
                  <ExternalLink className="me-1.5 h-3.5 w-3.5" />
                  زيارة الموقع
                </Link>
              </Button>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <div className="admin-user-chip">
                <Avatar className="h-[1.85rem] w-[1.85rem]">
                  <AvatarFallback className="text-[10px]">
                    {user?.name?.charAt(0)?.toUpperCase() || "أ"}
                  </AvatarFallback>
                </Avatar>
                <span className="admin-user-chip-name">{user?.name || user?.email}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </header>
        <main className="admin-main">
          <div className="admin-page">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}
