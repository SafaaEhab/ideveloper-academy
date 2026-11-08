import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, GraduationCap, Home, LogOut, Moon, ShieldAlert, Sun, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { LoadingBlock } from "./shared";
import InstructorGroups from "./InstructorGroups";
import InstructorGroupDetail from "./InstructorGroupDetail";
import InstructorStudentDetail from "./InstructorStudentDetail";
import InstructorAnalytics from "./InstructorAnalytics";

const ROUTE_PATTERN = /^\/instructor(?:\/analytics|\/group\/(\d+)(?:\/student\/(\d+))?)?\/?$/;

/**
 * The instructor's whole workspace: `/instructor` lists their groups,
 * `/instructor/group/:id` is the evaluation sheet, and
 * `/instructor/group/:id/student/:studentId` is one learner's history.
 *
 * None of the access control lives here — every query and mutation below is
 * already gated by `instructorProcedure` and the per-session ownership rule on
 * the server. This shell only decides what to *show* once the server has
 * answered, so typing someone else's group id yields the same refusal card.
 */
export default function InstructorPortal() {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const previousDir = root.getAttribute("dir");
    const previousLang = root.getAttribute("lang");
    root.setAttribute("dir", "rtl");
    root.setAttribute("lang", "ar");
    return () => {
      if (previousDir === null) root.removeAttribute("dir");
      else root.setAttribute("dir", previousDir);
      if (previousLang === null) root.removeAttribute("lang");
      else root.setAttribute("lang", previousLang);
    };
  }, []);

  const isInstructor = user?.role === "instructor";
  const me = trpc.instructor.me.useQuery(undefined, {
    retry: false,
    enabled: isInstructor,
  });

  const match = ROUTE_PATTERN.exec(location);
  const isAnalytics =
    location === "/instructor/analytics" || location === "/instructor/analytics/";
  const groupId = match?.[1] ? Number(match[1]) : null;
  const studentId = match?.[2] ? Number(match[2]) : null;

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-4 w-4 text-primary" />
          جارٍ تحميل بوابة المدرّب…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <AccessCard
        title="بوابة المدرّبين"
        description="سجّل الدخول بحساب المدرّب الذي أنشأته لك إدارة الأكاديمية للوصول إلى مجموعاتك وتقييم طلابك."
        action={
          <Link
            href="/login?returnTo=/instructor"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            تسجيل الدخول
          </Link>
        }
      />
    );
  }

  if (!isInstructor) {
    return (
      <AccessCard
        icon={ShieldAlert}
        title="هذه الصفحة للمدرّبين فقط"
        description={`أنت مسجّل الدخول بحساب ${user.email || "آخر"}. لوحة المدرّب تُفتح فقط لحسابات المدرّبين المفعّلة.`}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href={user.role === "admin" ? "/admin" : "/student"}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {user.role === "admin" ? "فتح لوحة الإدارة" : "فتح بوابة الطالب"}
            </Link>
            <Button variant="outline" className="h-11 rounded-2xl" onClick={logout}>
              <LogOut className="me-2 h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        }
      />
    );
  }

  if (me.isLoading) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16">
        <LoadingBlock label="جارٍ تجهيز مجموعاتك…" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <AccessCard
        icon={ShieldAlert}
        title="حساب المدرّب غير متاح"
        description="يبدو أن حساب المدرّب موقوف أو تمت إزالته. تواصل مع إدارة الأكاديمية لإعادة تفعيله."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              <Home className="me-2 h-4 w-4" />
              الصفحة الرئيسية
            </Link>
            <Button variant="outline" className="h-11 rounded-2xl" onClick={logout}>
              <LogOut className="me-2 h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        }
      />
    );
  }

  if (!me.data) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16">
        <LoadingBlock label="جارٍ تجهيز مجموعاتك…" />
      </div>
    );
  }

  if (!match) {
    return (
      <AccessCard
        icon={ShieldAlert}
        title="الصفحة غير موجودة"
        description="الرابط الذي فتحته لا يطابق أي شاشة في بوابة المدرّب."
        action={
          <Link
            href="/instructor"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            العودة إلى مجموعاتي
          </Link>
        }
      />
    );
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
        <Link href="/instructor" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-primary/20">
            <img
              src="https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/logo.png"
              alt="iDeveloper"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">
              بوابة المدرّب · iDeveloper
            </span>
            <span className="block truncate text-[11px] text-muted-foreground sm:text-xs">
              {me.data.name}
              {me.data.title ? ` · ${me.data.title}` : ""}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden rounded-full border border-border bg-card/70 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground sm:block"
          >
            موقع الأكاديمية
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="تبديل الوضع الليلي"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="تسجيل الخروج">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-5 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card/60 p-2">
          <Link
            href="/instructor"
            className={
              !isAnalytics
                ? "inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
                : "inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            }
          >
            <Users className="h-4 w-4" />
            مجموعاتي
          </Link>
          <Link
            href="/instructor/analytics"
            className={
              isAnalytics
                ? "inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
                : "inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            }
          >
            <BarChart3 className="h-4 w-4" />
            تحليلات الأداء
          </Link>
        </nav>
        {isAnalytics ? (
          <InstructorAnalytics profile={me.data} />
        ) : groupId !== null && studentId !== null ? (
          <InstructorStudentDetail groupId={groupId} studentId={studentId} />
        ) : groupId !== null ? (
          <InstructorGroupDetail groupId={groupId} instructorId={me.data.id} />
        ) : (
          <InstructorGroups profile={me.data} />
        )}
      </main>
    </div>
  );
}

function AccessCard({
  icon: Icon = GraduationCap,
  title,
  description,
  action,
}: {
  icon?: typeof GraduationCap;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground"
    >
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Icon className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
        <div className="mt-6">{action}</div>
      </div>
    </div>
  );
}
