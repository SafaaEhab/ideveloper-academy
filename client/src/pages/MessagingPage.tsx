import { Link } from "wouter";
import { Home, Loader2, LogOut, MessageSquare, ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MessagingManager from "@/components/messaging/MessagingManager";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import "@/styles/admin.css";

export default function MessagingPage() {
  useDocumentLocale("ar", "rtl");
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-app admin-gate flex min-h-screen items-center justify-center p-6" dir="rtl">
        <Card className="w-full max-w-md rounded-3xl">
          <CardContent className="p-8 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-bold">المراسلة الجماعية</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              هذه الصفحة لموظفي المتابعة المصرح لهم. سجّل الدخول ثم عد إلى هنا.
            </p>
            <Link href="/login?returnTo=/messaging">
              <Button className="mt-6 w-full rounded-full">تسجيل الدخول</Button>
            </Link>
            <Link href="/" className="mt-3 block text-sm text-muted-foreground underline-offset-4 hover:underline">
              العودة للموقع
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user.phase2?.messaging) {
    return (
      <div className="admin-app admin-gate flex min-h-screen items-center justify-center p-6" dir="rtl">
        <Card className="w-full max-w-md rounded-3xl">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-4 text-2xl font-bold">لا تملك صلاحية المراسلة</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              الحساب <b dir="ltr">{user.email || user.name}</b> غير مصرح له
              بالمراسلة. اطلب من الأدمن تفعيل الصلاحية.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="outline" className="gap-2 rounded-full" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
              <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                العودة للموقع
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-app admin-frame admin-legacy min-h-screen" dir="rtl">
      <header className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center lg:px-8">
          <div>
            <div className="text-xs font-semibold text-primary">iDeveloper Academy</div>
            <div className="text-sm font-bold">مساحة المراسلة</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              مسجل الدخول: <b className="text-foreground">{user.name || user.email}</b>
            </span>
            <Link href="/admin?tab=messaging">
              <Button variant="outline" size="sm">لوحة الأدمن</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1">
                <Home className="h-3.5 w-3.5" /> الموقع
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => logout()}>
              <LogOut className="h-3.5 w-3.5" /> خروج
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <MessagingManager />
      </main>
    </div>
  );
}
