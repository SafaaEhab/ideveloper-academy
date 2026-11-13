import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

/**
 * Shown to a visitor who opened /admin without access. It asks for the two things
 * the owner needs to recognise them — name and email — plus the password they
 * want to sign in with once the request is approved. Nothing is granted here: the
 * owner gets an email and decides from the Admins tab, which only they can open.
 *
 * Every field starts empty on purpose. Prefilling from the session would put the
 * signed-in address on screen for anyone using a shared machine, and there is
 * nothing to gain by it — the person typing knows their own email.
 */
export default function AccessRequestForm({
  onSent,
}: {
  onSent?: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const request = trpc.site.requestAccess.useMutation({
    onSuccess: data => {
      setSent(email.trim());
      onSent?.(email.trim());
      toast.success(
        data.notified
          ? "تم إرسال الطلب — سيُفتح لك الوصول بعد الموافقة."
          : "تم حفظ الطلب — سيراه المالك في لوحة الإدارة.",
      );
    },
    onError: error => toast.error(error.message),
  });

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-start">
        <p className="font-semibold">تم استلام الطلب لـ {sent}</p>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          احتفظ بكلمة المرور التي اخترتها — ستستخدمها لتسجيل الدخول بعد الموافقة
          على الطلب. سجّل الدخول مجدداً بعد أن يصلك الرد.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 text-start"
      onSubmit={event => {
        event.preventDefault();
        if (!email.trim() || request.isPending) return;
        request.mutate({ email: email.trim(), name, password });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="access-name">الاسم</Label>
        <Input
          id="access-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="اسمك"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-email">البريد الإلكتروني</Label>
        <Input
          id="access-email"
          type="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@example.com"
          dir="ltr"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-password">اختر كلمة مرور</Label>
        <Input
          id="access-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="8 أحرف على الأقل"
        />
      </div>
      <Button
        type="submit"
        className="h-12 w-full rounded-2xl"
        disabled={!email.trim() || password.length < 8 || request.isPending}
      >
        {request.isPending ? "جارٍ الإرسال…" : "طلب صلاحية الوصول"}
      </Button>
      <p className="text-center text-xs leading-6 text-muted-foreground">
        يراجع المالك كل طلب بنفسه، ولا يُفتح أي وصول تلقائياً.
      </p>
    </form>
  );
}
