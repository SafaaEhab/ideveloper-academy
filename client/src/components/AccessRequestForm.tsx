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
 */
export default function AccessRequestForm({
  defaultEmail,
  onSent,
}: {
  defaultEmail?: string | null;
  onSent?: (email: string) => void;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const request = trpc.site.requestAccess.useMutation({
    onSuccess: data => {
      setSent(email.trim());
      onSent?.(email.trim());
      toast.success(
        data.notified
          ? "Request sent — you will get access once it is approved."
          : "Request saved — the owner will see it in the admin panel.",
      );
    },
    onError: error => toast.error(error.message),
  });

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-start">
        <p className="font-semibold">Request received for {sent}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep the password you chose — it is what you sign in with once the request
          is approved. Sign in again after you hear back.
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
        <Label htmlFor="access-name">Your name</Label>
        <Input
          id="access-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Your name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-email">Your email</Label>
        <Input
          id="access-email"
          type="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-password">Choose a password</Label>
        <Input
          id="access-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />
      </div>
      <Button
        type="submit"
        className="h-12 w-full rounded-2xl"
        disabled={!email.trim() || password.length < 8 || request.isPending}
      >
        {request.isPending ? "Sending..." : "Request access"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        The owner reviews every request personally. Nothing is opened automatically.
      </p>
    </form>
  );
}
