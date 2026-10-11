import { useState } from "react";
import { toast } from "sonner";
import { LogIn, ShieldOff, UserPlus } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import AccessRequestForm from "@/components/AccessRequestForm";

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Sign in failed");

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

      toast.success("Signed in");
      const result = await refresh();
      // A successful sign-in that still lands on this page means the account has
      // no access yet, so send them to the request form rather than a dead end.
      if (result?.data?.role !== "admin") {
        setPassword("");
        setMode("request");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-3xl">
        <CardContent className="p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <ShieldOff className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-5 text-center text-2xl font-bold">Admin workspace</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sign in if you already have an account, otherwise ask for one.
          </p>

          {user && (
            <div className="mt-5 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center text-sm">
              Signed in as <b>{user.email || user.name}</b> — this account has no
              access yet.
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
            <Button
              type="button"
              variant={mode === "signin" ? "default" : "ghost"}
              className="rounded-xl"
              onClick={() => setMode("signin")}
            >
              <LogIn className="me-2 h-4 w-4" />I have an account
            </Button>
            <Button
              type="button"
              variant={mode === "request" ? "default" : "ghost"}
              className="rounded-xl"
              onClick={() => setMode("request")}
            >
              <UserPlus className="me-2 h-4 w-4" />Request access
            </Button>
          </div>

          <div className="mt-6">
            {mode === "signin" ? (
              <form className="space-y-4 text-start" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="gate-email">Email</Label>
                  <Input
                    id="gate-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gate-password">Password</Label>
                  <Input
                    id="gate-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Your password"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl"
                  disabled={!email.trim() || !password || busy}
                >
                  {busy ? "Signing in..." : "Sign in"}
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
            Back to the site
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
