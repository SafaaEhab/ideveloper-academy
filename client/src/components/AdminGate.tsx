import { useState } from "react";
import { toast } from "sonner";
import { LogIn, ShieldOff, UserPlus } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import AccessRequestForm from "@/components/AccessRequestForm";
import { API_BASE_URL } from "@/const";

/**
 * The front door of /admin for anyone who is not an admin yet.
 *
 * Two paths, because "do I already have an account?" is the only question standing
 * between a visitor and the workspace: people who signed up before go straight in
 * with the password they already chose, and people who have not ask for one here.
 *
 * There is deliberately no "does this email exist?" lookup — answering it would
 * turn this page into a way to enumerate who has an account, which is exactly what
 * the sign-in endpoint avoids by replying the same way either way. The visitor
 * simply picks the branch that describes them.
 */
export default function AdminGate() {
  const { user, refresh } = useAuth();
  // Already signed in but without access: asking them to sign in again is noise,
  // so the request form is what they land on.
  const [mode, setMode] = useState<"signin" | "request">(
    user ? "request" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password || busy) return;

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذر تسجيل الدخول");

      // Mirror the session for browsers that block the cookie (Safari ITP,
      // private mode). The server accepts it as a Bearer token.
      try {
        if (data?.token) {
          const { COOKIE_NAME } = await import("@shared/const");
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.token}`);
        }
      } catch {
        // sessionStorage unavailable — the cookie alone still works.
      }

      toast.success("تم تسجيل الدخول");
      const result = await refresh();
      // A successful sign-in that still lands on this page means the account has
      // no access yet, so send them to the request form rather than a dead end.
      // A reception employee already granted leads access goes to that
      // workspace instead of asking for an admin invite they do not need.
      if (result?.data?.role !== "admin") {
        if (result?.data?.leadAccess) {
          window.location.href = "/leads";
          return;
        }
        setPassword("");
        setMode("request");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="admin-shell flex min-h-screen items-center justify-center p-6">
      <Card className="admin-card w-full max-w-md">
        <CardContent className="p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <ShieldOff className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-5 text-center text-2xl font-extrabold">
            مساحة عمل الإدارة
          </h1>
          <p className="mt-2 text-center text-sm leading-7 text-muted-foreground">
            سجّل الدخول إن كان لديك حساب، أو اطلب صلاحية الوصول.
          </p>

          {user && (
            <div className="mt-5 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center text-sm leading-7">
              مسجّل الدخول باسم <b>{user.email || user.name}</b> — هذا الحساب
              لا يملك صلاحية الوصول بعد.
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
            <Button
              type="button"
              variant={mode === "signin" ? "default" : "ghost"}
              className="rounded-xl"
              onClick={() => setMode("signin")}
            >
              <LogIn className="me-2 h-4 w-4" />
              لديّ حساب
            </Button>
            <Button
              type="button"
              variant={mode === "request" ? "default" : "ghost"}
              className="rounded-xl"
              onClick={() => setMode("request")}
            >
              <UserPlus className="me-2 h-4 w-4" />
              طلب صلاحية
            </Button>
          </div>

          <div className="mt-6">
            {mode === "signin" ? (
              <form className="space-y-4 text-start" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="gate-email">البريد الإلكتروني</Label>
                  <Input
                    id="gate-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gate-password">كلمة المرور</Label>
                  <Input
                    id="gate-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="كلمة المرور"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl"
                  disabled={!email.trim() || !password || busy}
                >
                  {busy ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
                </Button>
              </form>
            ) : (
              // No `onSent` here on purpose: after sending, the form swaps itself
              // for a "request received" confirmation, and switching tabs back
              // would throw that confirmation away before it can be read.
              <AccessRequestForm />
            )}
          </div>

          <Button
            variant="ghost"
            className="mt-4 h-11 w-full rounded-2xl"
            onClick={() => (window.location.href = "/")}
          >
            العودة إلى الموقع
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
