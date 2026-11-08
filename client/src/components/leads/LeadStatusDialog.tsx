import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_STATUS_LABELS,
  NOT_INTERESTED_REASONS,
  NOT_INTERESTED_REASON_LABELS,
  type LeadStatus,
  type NotInterestedReason,
} from "@shared/leads";
import { trpc } from "@/lib/trpc";
import { toDateTimeLocal } from "./leadsUi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: number;
    fullName: string;
    status: LeadStatus;
    nextFollowUpDate: Date | string | null;
  };
  targetStatus: Extract<LeadStatus, "needs_follow_up" | "not_interested">;
  onDone?: () => void;
};

export default function LeadStatusDialog({
  open,
  onOpenChange,
  lead,
  targetStatus,
  onDone,
}: Props) {
  const utils = trpc.useUtils();
  const [followUp, setFollowUp] = useState("");
  const [reason, setReason] = useState<NotInterestedReason | "">("");
  const [reasonNote, setReasonNote] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFollowUp(toDateTimeLocal(lead.nextFollowUpDate));
      setReason("");
      setReasonNote("");
      setNote("");
      setError(null);
    }
  }, [open, lead.nextFollowUpDate, lead.id]);

  const mutation = trpc.leads.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة العميل");
      utils.leads.list.invalidate();
      utils.leads.detail.invalidate({ id: lead.id });
      onOpenChange(false);
      onDone?.();
    },
    onError: updateError => setError(updateError.message),
  });

  const submit = () => {
    setError(null);
    const nextFollowUpDate =
      targetStatus === "needs_follow_up" && followUp
        ? new Date(followUp).toISOString()
        : null;
    mutation.mutate({
      id: lead.id,
      status: targetStatus,
      nextFollowUpDate,
      notInterestedReason:
        targetStatus === "not_interested" && reason ? reason : null,
      notInterestedNote:
        targetStatus === "not_interested" && reasonNote.trim()
          ? reasonNote.trim()
          : null,
      note: note.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {targetStatus === "needs_follow_up"
              ? "تحويل إلى يحتاج متابعة"
              : "تسجيل عدم الرغبة"}
          </DialogTitle>
          <DialogDescription>
            العميل:{" "}
            <span className="font-semibold text-foreground">
              {lead.fullName}
            </span>
            {" — "}الحالة الحالية: {LEAD_STATUS_LABELS[lead.status]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-start">
          {targetStatus === "needs_follow_up" ? (
            <div>
              <Label htmlFor="lead-follow-up" className="mb-2 block text-sm">
                موعد المتابعة القادم (اختياري)
              </Label>
              <Input
                id="lead-follow-up"
                type="datetime-local"
                value={followUp}
                onChange={event => setFollowUp(event.target.value)}
                className="text-start"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                بعد الموعد سيظهر تنبيه أحمر «متأخر في الاتصال».
              </p>
            </div>
          ) : (
            <>
              <div>
                <Label className="mb-2 block text-sm">سبب عدم الإكمال</Label>
                <Select
                  value={reason}
                  onValueChange={value =>
                    setReason(value as NotInterestedReason)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر السبب (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOT_INTERESTED_REASONS.map(value => (
                      <SelectItem key={value} value={value}>
                        {NOT_INTERESTED_REASON_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="lead-reason-note"
                  className="mb-2 block text-sm"
                >
                  تفاصيل السبب (اختياري)
                </Label>
                <Input
                  id="lead-reason-note"
                  value={reasonNote}
                  onChange={event => setReasonNote(event.target.value)}
                  maxLength={500}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="lead-status-note" className="mb-2 block text-sm">
              ملاحظة على التغيير (اختياري)
            </Label>
            <Textarea
              id="lead-status-note"
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الحالة"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
