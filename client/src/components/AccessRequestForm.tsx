import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

/**
 * Shown to a signed-in visitor who has no admin access. It only asks for the two
 * things the owner needs to recognise them — nothing is granted here. The owner
 * gets an email and decides, from the Admins tab, whether to approve.
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
          The academy admin has been emailed and will approve it from the admin panel. Reload
          this page once you hear back.
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
        request.mutate({ email: email.trim(), name });
      }}
    >
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
        <Label htmlFor="access-name">Your name</Label>
        <Input
          id="access-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Your name"
        />
      </div>
      <Button type="submit" className="h-12 w-full rounded-2xl" disabled={!email.trim() || request.isPending}>
        {request.isPending ? "Sending..." : "Request access"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        The admin gets an email and approves it themselves. Nothing is opened automatically.
      </p>
    </form>
  );
}