import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, CheckCircle2, Pencil, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MESSAGE_VARIABLES,
  MESSAGE_VARIABLE_LABELS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  extractVariables,
} from "@shared/messaging";
import { statusTone } from "@/lib/phase2";

const META_STATUS_LABELS: Record<string, string> = {
  approved: "معتمد",
  pending: "قيد المراجعة",
  rejected: "مرفوض",
  paused: "موقوف",
  disabled: "معطّل",
  deleted: "محذوف",
  unknown: "غير معروف",
};

type FormState = {
  id?: number;
  name: string;
  category: string;
  body: string;
  metaTemplateName: string;
  language: string;
  metaCategory: string;
  metaStatus: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "welcome",
  body: "مرحباً {{student_name}}،\nسعداء بانضمامك إلى كورس {{course_name}} في iDeveloper Academy.",
  metaTemplateName: "",
  language: "ar",
  metaCategory: "utility",
  metaStatus: "pending",
  active: true,
};

export default function TemplateManager({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const list = trpc.messaging.templates.list.useQuery(
    { includeInactive: isAdmin },
    { retry: false },
  );
  const save = trpc.messaging.templates.create.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ القالب");
      setForm(EMPTY_FORM);
      setShowForm(false);
      utils.messaging.templates.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.messaging.templates.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث القالب");
      setForm(EMPTY_FORM);
      setShowForm(false);
      utils.messaging.templates.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.messaging.templates.archive.useMutation({
    onSuccess: () => {
      toast.success("تم أرشفة القالب");
      utils.messaging.templates.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const refresh = trpc.messaging.templates.refreshMetaStatus.useMutation({
    onSuccess: result => {
      toast.success(`حالة Meta: ${result.providerStatus}`);
      utils.messaging.templates.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const variables = useMemo(() => extractVariables(form.body), [form.body]);

  const insertVariable = (name: string) => {
    setForm(current => ({
      ...current,
      body: `${current.body}{{${name}}}`,
    }));
  };

  const startEdit = (template: NonNullable<typeof list.data>[number]) => {
    setForm({
      id: template.id,
      name: template.name,
      category: template.category,
      body: template.body,
      metaTemplateName: template.metaTemplateName ?? "",
      language: template.language,
      metaCategory: template.metaCategory ?? "utility",
      metaStatus: template.metaStatus,
      active: template.active,
    });
    setShowForm(true);
  };

  const submit = () => {
    if (form.id) {
      update.mutate({
        id: form.id,
        name: form.name,
        category: form.category as never,
        body: form.body,
        variables,
        metaTemplateName: form.metaTemplateName || null,
        language: form.language,
        metaCategory: form.metaCategory as never,
        metaStatus: form.metaStatus as never,
        active: form.active,
      });
    } else {
      save.mutate({
        name: form.name,
        category: form.category as never,
        body: form.body,
        variables,
        metaTemplateName: form.metaTemplateName || null,
        language: form.language,
        metaCategory: form.metaCategory as never,
        metaStatus: form.metaStatus as never,
        active: form.active,
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-xl font-bold">قوالب الرسائل</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            قوالب مشتركة قابلة للتعديل: ترحيب، تذكير حصة، تذكير دفع، ومتابعة
            عميل. إدارة القوالب المشتركة للأدمن فقط.
          </p>
        </div>
        {isAdmin ? (
          <Button
            className="gap-2"
            onClick={() => {
              setForm(EMPTY_FORM);
              setShowForm(value => !value);
            }}
          >
            <Plus className="h-4 w-4" />
            قالب جديد
          </Button>
        ) : null}
      </div>

      {!isAdmin ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          يمكنك استخدام القوالب في الحملات، لكن تعديل القوالب المشتركة متاح
          للأدمن فقط.
        </div>
      ) : null}

      {showForm && isAdmin ? (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{form.id ? "تعديل القالب" : "قالب جديد"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block">اسم القالب</Label>
                <Input
                  value={form.name}
                  onChange={event =>
                    setForm(current => ({ ...current, name: event.target.value }))
                  }
                  placeholder="ترحيب الطلاب الجدد"
                />
              </div>
              <div>
                <Label className="mb-2 block">الفئة</Label>
                <Select
                  value={form.category}
                  onValueChange={value =>
                    setForm(current => ({ ...current, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {TEMPLATE_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label>نص الرسالة</Label>
                <div className="flex flex-wrap gap-1">
                  {MESSAGE_VARIABLES.map(variable => (
                    <Button
                      key={variable}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => insertVariable(variable)}
                    >
                      {`{{${variable}}}`} · {MESSAGE_VARIABLE_LABELS[variable]}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={form.body}
                onChange={event =>
                  setForm(current => ({ ...current, body: event.target.value }))
                }
                rows={7}
                className="text-start"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                المتغيرات المكتشفة:{" "}
                {variables.length ? variables.join(", ") : "لا يوجد"}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="mb-2 block">اسم قالب Meta (اختياري)</Label>
                <Input
                  value={form.metaTemplateName}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      metaTemplateName: event.target.value,
                    }))
                  }
                  placeholder="welcome_student"
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="mb-2 block">اللغة</Label>
                <Input
                  value={form.language}
                  onChange={event =>
                    setForm(current => ({ ...current, language: event.target.value }))
                  }
                  placeholder="ar"
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="mb-2 block">فئة Meta</Label>
                <Select
                  value={form.metaCategory}
                  onValueChange={value =>
                    setForm(current => ({ ...current, metaCategory: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">تسويقي</SelectItem>
                    <SelectItem value="utility">خدمي</SelectItem>
                    <SelectItem value="authentication">مصادقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs leading-6 text-sky-800 dark:text-sky-200">
              الحالة المحفوظة هنا ليست دليلاً على الاعتماد. قبل بدء أي حملة
              يتحقق النظام مباشرة من Meta أن القالب <b>معتمد</b>، ويرفض
              الإرسال إذا كان معلقاً أو مرفوضاً أو غير موجود.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!form.name.trim() || !form.body.trim() || save.isPending || update.isPending}
                onClick={submit}
              >
                {save.isPending || update.isPending ? "جاري الحفظ…" : "حفظ القالب"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {(list.data ?? []).map(template => (
          <Card key={template.id} className="rounded-3xl">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TEMPLATE_CATEGORY_LABELS[template.category]} ·{" "}
                    {template.language} · {template.metaTemplateName || "بدون قالب Meta"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">
                    {TEMPLATE_CATEGORY_LABELS[template.category]}
                  </Badge>
                  <Badge className={statusTone(template.metaStatus)}>
                    Meta: {META_STATUS_LABELS[template.metaStatus] ?? template.metaStatus}
                  </Badge>
                  {!template.active ? <Badge variant="outline">مؤرشف</Badge> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap rounded-2xl bg-muted/40 p-3 text-sm leading-7">
                {template.body}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>المتغيرات: {template.variables || "—"}</span>
                {template.metaStatusCheckedAt ? (
                  <span>
                    آخر تحقق:{" "}
                    {new Date(template.metaStatusCheckedAt).toLocaleString("ar-EG")}
                  </span>
                ) : (
                  <span className="text-amber-600">لم يُتحقق من Meta بعد</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {isAdmin ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => startEdit(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={!template.metaTemplateName || refresh.isPending}
                      onClick={() => refresh.mutate({ id: template.id })}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      تحقق من Meta
                    </Button>
                    {template.active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-destructive"
                        onClick={() => archive.mutate({ id: template.id })}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        أرشفة
                      </Button>
                    ) : null}
                  </>
                ) : template.metaStatus === "approved" ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> متاح للاستخدام
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <ShieldAlert className="h-3.5 w-3.5" /> غير معتمد للإرسال
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!list.data?.length ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground lg:col-span-2">
            لا توجد قوالب بعد. {isAdmin ? "أضف أول قالب." : "اطلب من الأدمن إضافة قالب."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
