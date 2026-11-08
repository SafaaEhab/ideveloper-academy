import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import Reveal from "@/components/Reveal";
import SiteLayout from "@/components/SiteLayout";
import { COURSES } from "@/data/academyContent";
import { buildRegistrationWhatsAppLink, type RegistrationValues } from "@/lib/contact";
import { trpc } from "@/lib/trpc";
import {
  PHONE_REQUIRED_MESSAGE,
  PHONE_VALIDATION_MESSAGE,
  normalizePhone,
  validatePhone,
} from "@shared/validation";

type FormState = {
  fullName: string;
  phone: string;
  age: string;
  address: string;
  school: string;
  parentEmail: string;
  parentPhone: string;
  course: string;
  gender: string;
  siblingRegistered: string;
  siblingName: string;
  siblingPhone: string;
  notes: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialCourse() {
  const requested = new URLSearchParams(window.location.search).get("course")?.toLowerCase();
  if (!requested) return "";
  const match = COURSES.find(
    course => course.slug.toLowerCase() === requested || course.title.toLowerCase() === requested
  );
  return match?.title ?? "";
}

const EMPTY_FORM: FormState = {
  fullName: "",
  phone: "",
  age: "",
  address: "",
  school: "",
  parentEmail: "",
  parentPhone: "",
  course: "",
  gender: "",
  siblingRegistered: "",
  siblingName: "",
  siblingPhone: "",
  notes: "",
};

const requiredMessage = "هذا الحقل مطلوب";

/**
 * The standalone registration page. The original site sends this form to the
 * academy; here every answer is collected with the same fields, validated in
 * place, then handed to the team as one WhatsApp message — the channel the
 * academy already uses for bookings.
 */
export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY_FORM, course: initialCourse() }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitRegistration = trpc.site.submitRegistration.useMutation();

  const update = (key: keyof FormState, value: string) => {
    setForm(current => {
      const next = { ...current, [key]: value };
      if (key === "siblingRegistered" && value === "no") {
        next.siblingName = "";
        next.siblingPhone = "";
      }
      return next;
    });
    setErrors(current => ({ ...current, [key]: undefined }));
    setSubmitted(false);
    setDuplicateMessage(null);
    setSubmitError(null);
  };

  const phoneError = (value: string) => {
    const result = validatePhone(value);
    return result.ok
      ? undefined
      : result.reason === "required"
        ? PHONE_REQUIRED_MESSAGE
        : PHONE_VALIDATION_MESSAGE;
  };

  const validate = (values: FormState): Errors => {
    const next: Errors = {};
    if (!values.fullName.trim()) next.fullName = requiredMessage;
    const primaryPhoneError = phoneError(values.phone);
    if (primaryPhoneError) next.phone = primaryPhoneError;
    const age = Number(values.age);
    if (!values.age.trim()) next.age = requiredMessage;
    else if (!Number.isInteger(age) || age < 6 || age > 17) next.age = "العمر المتاح من 6 إلى 17 سنة";
    if (!values.address.trim()) next.address = requiredMessage;
    if (!values.school.trim()) next.school = requiredMessage;
    if (!values.parentEmail.trim()) next.parentEmail = requiredMessage;
    else if (!EMAIL_RE.test(values.parentEmail)) next.parentEmail = "اكتب بريد إلكتروني صحيح";
    const parentPhoneError = phoneError(values.parentPhone);
    if (parentPhoneError) next.parentPhone = parentPhoneError;
    if (!values.course) next.course = "اختر الدورة";
    if (!values.gender) next.gender = "اختر الجنس";
    if (!values.siblingRegistered) next.siblingRegistered = "اختر الإجابة";
    if (values.siblingRegistered === "yes") {
      if (!values.siblingName.trim()) next.siblingName = requiredMessage;
      const siblingPhoneError = phoneError(values.siblingPhone ?? "");
      if (siblingPhoneError) next.siblingPhone = siblingPhoneError;
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitRegistration.isPending) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const values: RegistrationValues = {
      ...form,
      phone: normalizePhone(form.phone),
      parentPhone: normalizePhone(form.parentPhone),
      siblingPhone: form.siblingPhone ? normalizePhone(form.siblingPhone) : "",
    };
    setSubmitError(null);
    try {
      // The success screen is shown only after the server confirms the row.
      const result = await submitRegistration.mutateAsync({
        fullName: values.fullName.trim(),
        phone: values.phone,
        age: Number(values.age),
        address: values.address.trim(),
        school: values.school.trim(),
        parentEmail: values.parentEmail.trim(),
        parentPhone: values.parentPhone,
        course: values.course as "Scratch" | "Robotics" | "Web" | "Python",
        gender: values.gender as "male" | "female",
        siblingRegistered: values.siblingRegistered === "yes",
        siblingName: values.siblingRegistered === "yes" ? values.siblingName?.trim() ?? "" : "",
        siblingPhone: values.siblingRegistered === "yes" ? values.siblingPhone ?? "" : "",
        notes: values.notes?.trim() ?? "",
      });
      setSentLink(buildRegistrationWhatsAppLink(values));
      setDuplicateMessage(result.duplicate ? result.duplicateMessage ?? null : null);
      setSubmitted(true);
    } catch (error) {
      // Never show the success state for a failed write.
      setSubmitError(
        error instanceof Error
          ? error.message
          : "تعذّر إرسال الطلب. جرّب مرة أخرى.",
      );
    }
  };

  const errorText = (key: keyof FormState) =>
    errors[key] ? <p className="mt-1.5 text-xs text-destructive">{errors[key]}</p> : null;

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border/60 bg-card/40">
        <div className="pointer-events-none absolute -start-32 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              افتح لابنك باب عالم التكنولوجيا
            </div>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight md:text-5xl">نموذج التسجيل</h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
              املأ بيانات الطالب وولي الأمر، ومتنساش إن إيميل ولي الأمر لازم يكون إيميله الشخصي، ثم
              اضغط إرسال لإتمام التسجيل.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          {submitted ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="mt-4 text-xl font-bold">
                {duplicateMessage
                  ? "الطلب مسجل بالفعل"
                  : "تم استلام الطلب وحفظه بنجاح"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted-foreground">
                {duplicateMessage ??
                  "طلب التسجيل محفوظ عند فريق الأكاديمية، وهنراجع البيانات ونتواصل معك. لو حابب تسرّع المتابعة، تقدر تفتح واتساب وتبعت نفس البيانات — وده اختياري."}
              </p>
              {duplicateMessage ? (
                <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
                  لم يتم إنشاء تسجيل جديد، وسيتم التواصل معك على نفس البيانات المسجلة.
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a href={sentLink} target="_blank" rel="noopener noreferrer">
                  <Button className="rounded-full px-6">فتح واتساب (اختياري)</Button>
                </a>
                <Button
                  variant="outline"
                  className="rounded-full px-6"
                  onClick={() => {
                    setSubmitted(false);
                    setDuplicateMessage(null);
                  }}
                >
                  تعديل البيانات
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-3xl border border-border bg-card/60 p-6 md:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reg-name" className="mb-2 block text-sm">
                    الاسم الكامل *
                  </Label>
                  <Input
                    id="reg-name"
                    value={form.fullName}
                    onChange={event => update("fullName", event.target.value)}
                    aria-invalid={!!errors.fullName}
                    autoComplete="name"
                  />
                  {errorText("fullName")}
                </div>

                <div>
                  <Label htmlFor="reg-phone" className="mb-2 block text-sm">
                    رقم الهاتف *
                  </Label>
                  <Input
                    id="reg-phone"
                    value={form.phone}
                    onChange={event => update("phone", event.target.value)}
                    aria-invalid={!!errors.phone}
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel"
                  />
                  {errorText("phone")}
                </div>

                <div>
                  <Label htmlFor="reg-age" className="mb-2 block text-sm">
                    العمر *
                  </Label>
                  <Input
                    id="reg-age"
                    value={form.age}
                    onChange={event => update("age", event.target.value)}
                    aria-invalid={!!errors.age}
                    inputMode="numeric"
                    placeholder="من 6 إلى 17 سنة"
                  />
                  {errorText("age")}
                </div>

                <div>
                  <Label htmlFor="reg-school" className="mb-2 block text-sm">
                    المدرسة *
                  </Label>
                  <Input
                    id="reg-school"
                    value={form.school}
                    onChange={event => update("school", event.target.value)}
                    aria-invalid={!!errors.school}
                  />
                  {errorText("school")}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="reg-address" className="mb-2 block text-sm">
                    العنوان *
                  </Label>
                  <Input
                    id="reg-address"
                    value={form.address}
                    onChange={event => update("address", event.target.value)}
                    aria-invalid={!!errors.address}
                    autoComplete="street-address"
                  />
                  {errorText("address")}
                </div>

                <div>
                  <Label htmlFor="reg-parent-email" className="mb-2 block text-sm">
                    البريد الإلكتروني لولي الأمر *
                  </Label>
                  <Input
                    id="reg-parent-email"
                    value={form.parentEmail}
                    onChange={event => update("parentEmail", event.target.value)}
                    aria-invalid={!!errors.parentEmail}
                    inputMode="email"
                    dir="ltr"
                    autoComplete="email"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">يجب أن يكون إيميل ولي الأمر نفسه.</p>
                  {errorText("parentEmail")}
                </div>

                <div>
                  <Label htmlFor="reg-parent-phone" className="mb-2 block text-sm">
                    رقم ولي الأمر *
                  </Label>
                  <Input
                    id="reg-parent-phone"
                    value={form.parentPhone}
                    onChange={event => update("parentPhone", event.target.value)}
                    aria-invalid={!!errors.parentPhone}
                    inputMode="tel"
                    dir="ltr"
                  />
                  {errorText("parentPhone")}
                </div>

                <div>
                  <Label htmlFor="reg-course" className="mb-2 block text-sm">
                    اختر الدورة *
                  </Label>
                  <Select value={form.course} onValueChange={value => update("course", value)}>
                    <SelectTrigger id="reg-course" className="w-full" aria-invalid={!!errors.course}>
                      <SelectValue placeholder="اختر الدورة" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSES.map(course => (
                        <SelectItem key={course.slug} value={course.title}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errorText("course")}
                </div>

                <div>
                  <Label htmlFor="reg-gender" className="mb-2 block text-sm">
                    الجنس *
                  </Label>
                  <Select value={form.gender} onValueChange={value => update("gender", value)}>
                    <SelectTrigger id="reg-gender" className="w-full" aria-invalid={!!errors.gender}>
                      <SelectValue placeholder="اختر الجنس" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                  {errorText("gender")}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="reg-sibling" className="mb-2 block text-sm">
                    هل لديك أخ أو أخت سجل له من قبل في نفس الكورس؟ *
                  </Label>
                  <Select
                    value={form.siblingRegistered}
                    onValueChange={value => update("siblingRegistered", value)}
                  >
                    <SelectTrigger id="reg-sibling" className="w-full" aria-invalid={!!errors.siblingRegistered}>
                      <SelectValue placeholder="اختر الإجابة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                    </SelectContent>
                  </Select>
                  {errorText("siblingRegistered")}
                </div>

                {form.siblingRegistered === "yes" && (
                  <>
                    <div>
                      <Label htmlFor="reg-sibling-name" className="mb-2 block text-sm">
                        اسم الأخ / الأخت *
                      </Label>
                      <Input
                        id="reg-sibling-name"
                        value={form.siblingName}
                        onChange={event => update("siblingName", event.target.value)}
                        aria-invalid={!!errors.siblingName}
                      />
                      {errorText("siblingName")}
                    </div>

                    <div>
                      <Label htmlFor="reg-sibling-phone" className="mb-2 block text-sm">
                        رقم الهاتف للأخ / الأخت *
                      </Label>
                      <Input
                        id="reg-sibling-phone"
                        value={form.siblingPhone}
                        onChange={event => update("siblingPhone", event.target.value)}
                        aria-invalid={!!errors.siblingPhone}
                        inputMode="tel"
                        dir="ltr"
                      />
                      {errorText("siblingPhone")}
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <Label htmlFor="reg-notes" className="mb-2 block text-sm">
                    ملاحظات إضافية
                  </Label>
                  <Textarea
                    id="reg-notes"
                    value={form.notes}
                    onChange={event => update("notes", event.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <p className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-6 text-muted-foreground">
                انتظر دقائق حتى يتم إبلاغك أنه تم التسجيل بنجاح. بإرسال النموذج أنت توافق على{" "}
                <Link href="/terms" className="font-semibold text-primary underline-offset-4 hover:underline">
                  الشروط والأحكام
                </Link>{" "}
                و{" "}
                <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
                  سياسة الخصوصية
                </Link>
                .
              </p>

              <Button type="submit" size="lg" className="mt-6 w-full rounded-full px-8" disabled={submitRegistration.isPending}>
                {submitRegistration.isPending ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <Send className="me-2 h-5 w-5" />}
                {submitRegistration.isPending ? "جارٍ إرسال الطلب…" : "إرسال"}
              </Button>
              {submitError ? (
                <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
