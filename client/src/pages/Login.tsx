import { useState } from "react";
import { Link, useLocation, useSearchParams } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { API_BASE_URL } from "@/const";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";

const MIN_PASSWORD_LENGTH = 8;

type Mode = "login" | "signup";

export default function Login() {
  useDocumentLocale("en", "ltr");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const [location] = useLocation();

  const explicitReturnTo = searchParams.get("returnTo");
  const returnTo = explicitReturnTo ?? "/student";
  const isSignup = mode === "signup";
  const canSubmit =
    email.trim().length > 0 &&
    password.length >= (isSignup ? MIN_PASSWORD_LENGTH : 1) &&
    !busy;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong");

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

      const result = await refresh();
      // No explicit `returnTo`: send each role to the workspace it can use.
      // `auth.me` is server-authoritative, so this only picks a landing page —
      // the dashboards themselves still gate every request server-side.
      const role = result?.data?.role;
      const destination =
        explicitReturnTo ??
        (role === "admin"
          ? "/admin"
          : result?.data?.leadAccess
            ? "/leads"
            : role === "instructor"
              ? "/instructor"
              : returnTo);
      window.location.href = destination;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Login failed");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-3xl">
        <CardHeader>
          <h1 className="leading-none font-semibold">
            {isSignup ? "Create your account" : "Sign in"}
          </h1>
          <CardDescription>
            {isSignup
              ? "Create an account to reach the student portal."
              : "Welcome back — sign in to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="login-name">Name</Label>
                <Input
                  id="login-name"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                required
                minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
              />
            </div>

            <Button type="submit" className="h-12 w-full rounded-2xl" disabled={!canSubmit}>
              {busy ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setMode(isSignup ? "login" : "signup");
                setPassword("");
              }}
            >
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </p>

          <p className="mt-4 text-center text-sm">
            <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}