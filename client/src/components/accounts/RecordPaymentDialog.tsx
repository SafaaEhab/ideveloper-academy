import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, ReceiptText, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseAmountToMinor } from "@shared/money";
import { formatMinorAmount } from "@shared/money";
import { downloadBase64File, money, paymentMethodLabel } from "@/lib/phase2";

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  subscriptionId,
  studentName,
  course,
  remainingMinor,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: number;
  studentName?: string;
  course?: string;
  remainingMinor?: number;
  onRecorded?: () => void;
}) {
  const utils = trpc.useUtils();
  const reference = useRef("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<{
    dataBase64: string;
    mime: string;
    name: string;
  } | null>(null);
  const [result, setResult] = useState<{
    receiptNumber: string;
    paymentId: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reset only when the dialog opens. `remainingMinor` changes after a
    // successful payment (the subscription query is invalidated), and using it
    // as a dependency would wipe the receipt/download state at exactly the
    // moment the user needs it.
    setAmount(remainingMinor ? (remainingMinor / 100).toFixed(2) : "");
    setMethod("cash");
    setNotes("");
    setAttachment(null);
    setResult(null);
    reference.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const record = trpc.finance.payments.record.useMutation({
    onSuccess: data => {
      toast.success(
        `تم تسجيل الدفعة برقم إيصال ${data.payment.receiptNumber}`,
      );
      setResult({
        receiptNumber: data.payment.receiptNumber,
        paymentId: data.payment.id,
      });
      utils.finance.subscriptions.list.invalidate();
      utils.finance.payments.history.invalidate();
      utils.finance.dashboard.invalidate();
      utils.finance.reminders.list.invalidate();
      onRecorded?.();
    },
    onError: error => toast.error(error.message),
  });

  const downloadReceipt = async () => {
    if (!result) return;
    try {
      const file = await utils.finance.payments.receiptPdf.fetch({
        paymentId: result.paymentId,
      });
      downloadBase64File(file.fileName, file.base64, "application/pdf");
      toast.success("تم تنزيل الإيصال");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تنزيل الإيصال");
    }
  };

  const readFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم المرفق أكبر من 5 ميجابايت");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("نوع الملف غير مسموح. استخدم JPG أو PNG أو WEBP أو PDF.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      const base64 = value.includes(",") ? value.split(",")[1] : value;
      setAttachment({ dataBase64: base64, mime: file.type, name: file.name });
    };
    reader.onerror = () => toast.error("تعذر قراءة الملف");
    reader.readAsDataURL(file);
  };

  const parsed = amount.trim() ? parseAmountToMinor(amount) : null;
  const submit = () => {
    if (!parsed || !parsed.ok) {
      toast.error(parsed && !parsed.ok ? parsed.error : "اكتب المبلغ");
      return;
    }
    record.mutate({
      subscriptionId,
      amountMinor: parsed.minor,
      method: method as never,
      transactionReference: reference.current,
      notes: notes.trim() || null,
      receiptImage: attachment,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة</DialogTitle>
          <DialogDescription>
            {studentName ? `${studentName} · ${course ?? ""}` : "أدخل المبلغ وطريقة الدفع. التاريخ والموظف يُسجلان تلقائياً."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-200">
              <ReceiptText className="h-4 w-4" />
              تم تسجيل الدفعة وإصدار الإيصال {result.receiptNumber}
            </div>
            <Button className="w-full gap-2" onClick={downloadReceipt}>
              <Download className="h-4 w-4" />
              تنزيل إيصال PDF
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              إغلاق
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {remainingMinor != null ? (
              <div className="rounded-xl bg-muted/50 p-3 text-sm">
                المتبقي على الاشتراك: <b>{money(remainingMinor)}</b>
              </div>
            ) : null}
            <div>
              <Label className="mb-2 block">المبلغ (جنيه)</Label>
              <Input
                aria-label="مبلغ الدفعة"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                placeholder="مثال: 1250.50"
                inputMode="decimal"
                dir="ltr"
              />
              {parsed && !parsed.ok ? (
                <p className="mt-1 text-xs text-destructive">{parsed.error}</p>
              ) : null}
            </div>
            <div>
              <Label className="mb-2 block">طريقة الدفع</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["cash", "instapay", "wallet", "bank_transfer"].map(value => (
                    <SelectItem key={value} value={value}>
                      {paymentMethodLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">صورة الإيصال (اختياري)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {attachment ? attachment.name : "اختر صورة أو PDF (حتى 5MB)"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) readFile(file);
                  }}
                />
              </label>
            </div>
            <div>
              <Label className="mb-2 block">ملاحظات (اختياري)</Label>
              <Textarea
                value={notes}
                onChange={event => setNotes(event.target.value)}
                rows={2}
              />
            </div>
            <Button
              className="h-12 w-full"
              disabled={record.isPending || !parsed?.ok}
              onClick={submit}
            >
              {record.isPending ? "جاري تسجيل الدفعة…" : "تسجيل الدفعة"}
            </Button>
            <p className="text-xs leading-6 text-muted-foreground">
              لا يمكن حذف دفعة مسجلة. التصحيح يتم بقيد عكسي بسبب وموظف محددين.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
