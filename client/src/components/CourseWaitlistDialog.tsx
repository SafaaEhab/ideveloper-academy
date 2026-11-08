import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { PHONE_VALIDATION_MESSAGE, validatePhone } from "@shared/validation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: string | null;
};

/**
 * The waiting-list form behind a "Join waiting list" course card. The request
 * is persisted through the server; the success state only appears after that
 * write succeeds.
 */
export default function CourseWaitlistDialog({ open, onOpenChange, course }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const join = trpc.site.joinWaitingList.useMutation();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRequested(false);
  }, [open, course]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!course) return;
    const phoneResult = validatePhone(phone);
    if (!name.trim()) {
      setError("Write your name");
      return;
    }
    if (!phoneResult.ok) {
      setError(PHONE_VALIDATION_MESSAGE);
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email");
      return;
    }
    setError(null);
    try {
      await join.mutateAsync({
        course: course as "Scratch" | "Robotics" | "Web" | "Python",
        name: name.trim(),
        phone: phoneResult.value,
        email: email.trim(),
        note: note.trim(),
      });
      setRequested(true);
      toast.success("You are on the waiting list");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The request could not be saved";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>Join waiting list — {course ?? "Course"}</DialogTitle>
          <DialogDescription>
            نسجّل طلبك ونبلغك أول ما يفتح الحجز. البيانات بتتحفظ في الأكاديمية.
          </DialogDescription>
        </DialogHeader>

        {requested ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-sm font-bold">تم تسجيل طلبك في قائمة الانتظار</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              هنكلمك على {phone} أول ما يفتح الحجز.
            </p>
            <Button className="mt-5 rounded-full" onClick={() => onOpenChange(false)}>
              تمام
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="waitlist-name" className="mb-2 block text-sm">اسم الطالب / ولي الأمر *</Label>
              <Input
                id="waitlist-name"
                value={name}
                onChange={event => setName(event.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="waitlist-phone" className="mb-2 block text-sm">رقم الهاتف *</Label>
              <Input
                id="waitlist-phone"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                aria-invalid={Boolean(error && phone)}
              />
            </div>
            <div>
              <Label htmlFor="waitlist-email" className="mb-2 block text-sm">البريد الإلكتروني (اختياري)</Label>
              <Input
                id="waitlist-email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                inputMode="email"
                dir="ltr"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="waitlist-note" className="mb-2 block text-sm">ملاحظات (اختياري)</Label>
              <Textarea
                id="waitlist-note"
                value={note}
                onChange={event => setNote(event.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
            {error ? (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full rounded-full" disabled={join.isPending}>
              {join.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
              {join.isPending ? "جارٍ التسجيل…" : "سجّل في قائمة الانتظار"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
