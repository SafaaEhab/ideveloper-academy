import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Settings2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { money, subscriptionTypeLabel } from "@/lib/phase2";

const COURSES = ["Scratch", "Robotics", "Web", "Python"] as const;

type SettingsForm = {
  academyName: string;
  academyPhone: string;
  academyAddress: string;
  timezone: string;
  reminderEnabled: boolean;
  reminderOffsets: number[];
  reminderHour: string;
  siblingDiscountPercent: string;
  overpaymentPolicy: "credit" | "refund_required";
  thankYouEnabled: boolean;
  thankYouTemplateName: string;
  thankYouTemplateLanguage: string;
  cashHours: string;
  cashInstructions: string;
  instapayNumber: string;
  instapayInstructions: string;
  walletNumber: string;
  walletInstructions: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankInstructions: string;
  requireMarketingConsent: boolean;
  batchSize: string;
  delayMs: string;
  retryLimit: string;
  paymentReminderTemplateName: string;
  paymentReminderTemplateLanguage: string;
};

const EMPTY: SettingsForm = {
  academyName: "iDeveloper Academy",
  academyPhone: "",
  academyAddress: "",
  timezone: "Africa/Cairo",
  reminderEnabled: true,
  reminderOffsets: [-3, 0, 2, 7],
  reminderHour: "09:00",
  siblingDiscountPercent: "0",
  overpaymentPolicy: "credit",
  thankYouEnabled: false,
  thankYouTemplateName: "",
  thankYouTemplateLanguage: "ar",
  cashHours: "",
  cashInstructions: "",
  instapayNumber: "",
  instapayInstructions: "",
  walletNumber: "",
  walletInstructions: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIban: "",
  bankInstructions: "",
  requireMarketingConsent: true,
  batchSize: "25",
  delayMs: "1000",
  retryLimit: "3",
  paymentReminderTemplateName: "",
  paymentReminderTemplateLanguage: "ar",
};

export default function FinanceSettingsPanel() {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<SettingsForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [planDraft, setPlanDraft] = useState<
    Record<string, { price: string; type: string; active: boolean }>
  >({});
  const settings = trpc.finance.settings.get.useQuery(undefined, { retry: false });
  const plans = trpc.finance.coursePlans.list.useQuery(undefined, { retry: false });
  const update = trpc.finance.settings.update.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      utils.finance.settings.get.invalidate();
      utils.finance.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updatePlan = trpc.finance.coursePlans.update.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ خطة الكورس");
      utils.finance.coursePlans.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!settings.data || loaded) return;
    setForm({
      academyName: settings.data.academyName,
      academyPhone: settings.data.academyPhone,
      academyAddress: settings.data.academyAddress,
      timezone: settings.data.timezone,
      reminderEnabled: settings.data.reminderEnabled,
      reminderOffsets: settings.data.reminderOffsets,
      reminderHour: settings.data.reminderHour,
      siblingDiscountPercent: String(settings.data.siblingDiscountPercent),
      overpaymentPolicy: settings.data.overpaymentPolicy,
      thankYouEnabled: settings.data.thankYouEnabled,
      thankYouTemplateName: settings.data.thankYouTemplateName,
      thankYouTemplateLanguage: settings.data.thankYouTemplateLanguage,
      cashHours: settings.data.cashHours,
      cashInstructions: settings.data.cashInstructions,
      instapayNumber: settings.data.instapayNumber,
      instapayInstructions: settings.data.instapayInstructions,
      walletNumber: settings.data.walletNumber,
      walletInstructions: settings.data.walletInstructions,
      bankName: settings.data.bankName,
      bankAccountName: settings.data.bankAccountName,
      bankAccountNumber: settings.data.bankAccountNumber,
      bankIban: settings.data.bankIban,
      bankInstructions: settings.data.bankInstructions,
      requireMarketingConsent: settings.data.requireMarketingConsent,
      batchSize: String(settings.data.batchSize),
      delayMs: String(settings.data.delayMs),
      retryLimit: String(settings.data.retryLimit),
      paymentReminderTemplateName: settings.data.paymentReminderTemplateName,
      paymentReminderTemplateLanguage: settings.data.paymentReminderTemplateLanguage,
    });
    setLoaded(true);
  }, [settings.data, loaded]);

  useEffect(() => {
    if (!plans.data) return;
    setPlanDraft(current => {
      const next = { ...current };
      for (const course of COURSES) {
        if (next[course]) continue;
        const plan = plans.data.find(item => item.course === course);
        next[course] = {
          price: plan?.basePriceMinor ? (plan.basePriceMinor / 100).toFixed(2) : "",
          type: plan?.defaultSubscriptionType ?? "monthly",
          active: plan?.active ?? true,
        };
      }
      return next;
    });
  }, [plans.data]);

  const toggleOffset = (offset: number, checked: boolean) => {
    setForm(current => ({
      ...current,
      reminderOffsets: checked
        ? [...new Set([...current.reminderOffsets, offset])].sort((a, b) => a - b)
        : current.reminderOffsets.filter(value => value !== offset),
    }));
  };

  const save = () => {
    update.mutate({
      academyName: form.academyName,
      academyPhone: form.academyPhone,
      academyAddress: form.academyAddress,
      timezone: form.timezone,
      reminderEnabled: form.reminderEnabled,
      reminderOffsets: form.reminderOffsets,
      reminderHour: form.reminderHour,
      siblingDiscountPercent: Number(form.siblingDiscountPercent || 0),
      overpaymentPolicy: form.overpaymentPolicy,
      thankYouEnabled: form.thankYouEnabled,
      thankYouTemplateName: form.thankYouTemplateName,
      thankYouTemplateLanguage: form.thankYouTemplateLanguage,
      cashHours: form.cashHours,
      cashInstructions: form.cashInstructions,
      instapayNumber: form.instapayNumber,
      instapayInstructions: form.instapayInstructions,
      walletNumber: form.walletNumber,
      walletInstructions: form.walletInstructions,
      bankName: form.bankName,
      bankAccountName: form.bankAccountName,
      bankAccountNumber: form.bankAccountNumber,
      bankIban: form.bankIban,
      bankInstructions: form.bankInstructions,
      requireMarketingConsent: form.requireMarketingConsent,
      batchSize: Number(form.batchSize),
      delayMs: Number(form.delayMs),
      retryLimit: Number(form.retryLimit),
      paymentReminderTemplateName: form.paymentReminderTemplateName,
      paymentReminderTemplateLanguage: form.paymentReminderTemplateLanguage,
    });
  };

  const savePlan = (course: string) => {
    const draft = planDraft[course];
    if (!draft) return;
    let basePriceMinor: number | null = null;
    if (draft.price.trim()) {
      const parsed = parseAmountToMinor(draft.price);
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      basePriceMinor = parsed.minor;
    }
    updatePlan.mutate({
      course: course as never,
      basePriceMinor,
      currency: "EGP",
      defaultSubscriptionType: draft.type as never,
      active: draft.active,
    });
  };

  if (settings.isLoading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-xl font-bold">
          <Settings2 className="h-5 w-5" />
          إعدادات الرسائل والمدفوعات
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          كل الأسعار وبيانات التحويل يدخلها الأدمن. لا يفترض النظام سعراً أو
          حساباً بنكياً. اترك أي بيان فارغاً حتى تعتمده الأكاديمية.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader><CardTitle className="text-base">هوية الأكاديمية والتوقيت</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="mb-1 block text-xs">اسم الأكاديمية</Label><Input value={form.academyName} onChange={e => setForm({ ...form, academyName: e.target.value })} /></div>
            <div><Label className="mb-1 block text-xs">هاتف الأكاديمية</Label><Input value={form.academyPhone} onChange={e => setForm({ ...form, academyPhone: e.target.value })} dir="ltr" /></div>
            <div><Label className="mb-1 block text-xs">العنوان</Label><Input value={form.academyAddress} onChange={e => setForm({ ...form, academyAddress: e.target.value })} /></div>
            <div><Label className="mb-1 block text-xs">المنطقة الزمنية</Label><Input value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} dir="ltr" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="mb-1 block text-xs">موعد التذكير اليومي</Label><Input type="time" value={form.reminderHour} onChange={e => setForm({ ...form, reminderHour: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">نسبة خصم الأخ (٪)</Label><Input type="number" min={0} max={100} value={form.siblingDiscountPercent} onChange={e => setForm({ ...form, siblingDiscountPercent: e.target.value })} dir="ltr" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.reminderEnabled} onCheckedChange={value => setForm({ ...form, reminderEnabled: Boolean(value) })} />تفعيل التذكيرات التلقائية</label>
            <div>
              <Label className="mb-2 block text-xs">أيام التذكير حول الاستحقاق</Label>
              <div className="flex flex-wrap gap-3">
                {[[-3, "قبل 3 أيام"], [0, "يوم الاستحقاق"], [2, "متأخر يومان"], [7, "متأخر 7 أيام"]].map(([offset, label]) => (
                  <label key={offset} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
                    <Checkbox checked={form.reminderOffsets.includes(Number(offset))} onCheckedChange={value => toggleOffset(Number(offset), Boolean(value))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs">سياسة الدفع الزائد</Label>
              <Select value={form.overpaymentPolicy} onValueChange={value => setForm({ ...form, overpaymentPolicy: value as never })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">يبقى رصيداً دائناً للطالب (الافتراضي)</SelectItem>
                  <SelectItem value="refund_required">يتطلب استرداداً يدوياً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.thankYouEnabled} onCheckedChange={value => setForm({ ...form, thankYouEnabled: Boolean(value) })} />إرسال شكر بعد السداد الكامل</label>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="mb-1 block text-xs">قالب الشكر</Label><Input value={form.thankYouTemplateName} onChange={e => setForm({ ...form, thankYouTemplateName: e.target.value })} dir="ltr" placeholder="payment_thank_you" /></div>
              <div><Label className="mb-1 block text-xs">لغته</Label><Input value={form.thankYouTemplateLanguage} onChange={e => setForm({ ...form, thankYouTemplateLanguage: e.target.value })} dir="ltr" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader><CardTitle className="text-base">تعليمات الدفع لكل طريقة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border p-3">
              <div className="mb-2 text-sm font-semibold">نقداً في الأكاديمية</div>
              <Input value={form.cashHours} onChange={e => setForm({ ...form, cashHours: e.target.value })} placeholder="مواعيد العمل، مثال: يومياً 4–9 مساءً" />
              <Textarea className="mt-2" value={form.cashInstructions} onChange={e => setForm({ ...form, cashInstructions: e.target.value })} placeholder="أي تفاصيل إضافية" rows={2} />
            </div>
            <div className="rounded-xl border p-3">
              <div className="mb-2 text-sm font-semibold">إنستاباي</div>
              <Input value={form.instapayNumber} onChange={e => setForm({ ...form, instapayNumber: e.target.value })} placeholder="رقم/معرّف إنستاباي الرسمي" dir="ltr" />
              <Textarea className="mt-2" value={form.instapayInstructions} onChange={e => setForm({ ...form, instapayInstructions: e.target.value })} placeholder="اطلب صورة التحويل، إلخ" rows={2} />
            </div>
            <div className="rounded-xl border p-3">
              <div className="mb-2 text-sm font-semibold">المحفظة الإلكترونية</div>
              <Input value={form.walletNumber} onChange={e => setForm({ ...form, walletNumber: e.target.value })} placeholder="رقم المحفظة الرسمي" dir="ltr" />
              <Textarea className="mt-2" value={form.walletInstructions} onChange={e => setForm({ ...form, walletInstructions: e.target.value })} placeholder="اطلب صورة التحويل، إلخ" rows={2} />
            </div>
            <div className="rounded-xl border p-3">
              <div className="mb-2 text-sm font-semibold">تحويل بنكي</div>
              <Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="اسم البنك" />
              <Input className="mt-2" value={form.bankAccountName} onChange={e => setForm({ ...form, bankAccountName: e.target.value })} placeholder="اسم صاحب الحساب" />
              <Input className="mt-2" value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} placeholder="رقم الحساب" dir="ltr" />
              <Input className="mt-2" value={form.bankIban} onChange={e => setForm({ ...form, bankIban: e.target.value })} placeholder="IBAN" dir="ltr" />
              <Textarea className="mt-2" value={form.bankInstructions} onChange={e => setForm({ ...form, bankInstructions: e.target.value })} placeholder="تعليمات إضافية" rows={2} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <CardHeader><CardTitle className="text-base">ضبط أولوية التذكيرات والحملات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div><Label className="mb-1 block text-xs">حجم دفعة الإرسال</Label><Input type="number" min={1} max={100} value={form.batchSize} onChange={e => setForm({ ...form, batchSize: e.target.value })} /></div>
            <div><Label className="mb-1 block text-xs">التأخير بين الرسائل (ms)</Label><Input type="number" min={250} max={60000} value={form.delayMs} onChange={e => setForm({ ...form, delayMs: e.target.value })} /></div>
            <div><Label className="mb-1 block text-xs">حد إعادة المحاولة</Label><Input type="number" min={0} max={10} value={form.retryLimit} onChange={e => setForm({ ...form, retryLimit: e.target.value })} /></div>
            <div><Label className="mb-1 block text-xs">قالب تذكير الدفع</Label><Input value={form.paymentReminderTemplateName} onChange={e => setForm({ ...form, paymentReminderTemplateName: e.target.value })} dir="ltr" placeholder="payment_reminder_ar" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.requireMarketingConsent} onCheckedChange={value => setForm({ ...form, requireMarketingConsent: Boolean(value) })} />اشتراط موافقة واتساب للحملات التسويقية</label>
          <Button className="gap-2" disabled={update.isPending} onClick={save}>
            <Save className="h-4 w-4" />
            {update.isPending ? "جاري الحفظ…" : "حفظ كل الإعدادات"}
          </Button>
          <p className="text-xs leading-6 text-muted-foreground">
            التأخير وحجم الدفعة يقللان الضغط لكنهما لا يضمنان الحماية من قيود
            Meta. راقب جودة الرقم والحملات من لوحة Meta.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader><CardTitle className="text-base">أسعار الكورسات الافتراضية</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
            هذه الأسعار يدخلها المالك. أي سعر فارغ يعني أن إنشاء اشتراك لهذا
            الكورس سيتطلب إدخال المبلغ يدوياً. لا يتم اختراع سعر.
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COURSES.map(course => {
              const plan = plans.data?.find(item => item.course === course);
              const draft = planDraft[course] ?? {
                price: plan?.basePriceMinor ? (plan.basePriceMinor / 100).toFixed(2) : "",
                type: plan?.defaultSubscriptionType ?? "monthly",
                active: plan?.active ?? true,
              };
              return (
                <div key={course} className="rounded-2xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{course}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {plan?.basePriceMinor ? money(plan.basePriceMinor) : "غير مُكوّن"}
                    </span>
                  </div>
                  <Input value={draft.price} onChange={e => setPlanDraft({ ...planDraft, [course]: { ...draft, price: e.target.value } })} placeholder="السعر (جنيه)" inputMode="decimal" dir="ltr" />
                  <Select value={draft.type} onValueChange={value => setPlanDraft({ ...planDraft, [course]: { ...draft, type: value } })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{subscriptionTypeLabel("monthly")}</SelectItem>
                      <SelectItem value="two_months">{subscriptionTypeLabel("two_months")}</SelectItem>
                      <SelectItem value="one_time">{subscriptionTypeLabel("one_time")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="mt-2 flex items-center gap-2 text-xs"><Checkbox checked={draft.active} onCheckedChange={value => setPlanDraft({ ...planDraft, [course]: { ...draft, active: Boolean(value) } })} />نشط</label>
                  <Button size="sm" variant="outline" className="mt-2 w-full" disabled={updatePlan.isPending} onClick={() => savePlan(course)}>
                    حفظ {course}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
