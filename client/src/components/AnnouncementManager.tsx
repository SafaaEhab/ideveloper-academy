// @ts-check
/**
 * Admin panel for الإعلان — the popup every visitor sees when the site loads.
 *
 * The trainer writes the copy, picks whether the countdown and prizes appear,
 * and flips one switch to put the announcement on the site or take it down.
 * With nothing switched on, the popup never opens.
 */
import { useEffect, useState } from "react";
import { Megaphone, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import {
  ANNOUNCEMENT_LABELS,
  factsToLines,
  linesToFacts,
  linesToPrizes,
  normalizeWhatsAppNumber,
  prizesToLines,
  toDateTimeLocal,
} from "@/lib/announcement";

const emptyForm = {
  badge: "إعلان خاص",
  title: "",
  headline: "",
  body: "",
  ctaLabel: ANNOUNCEMENT_LABELS.defaultCta,
  ctaHint: ANNOUNCEMENT_LABELS.defaultHint,
  whatsappNumber: "",
  deadline: "",
  facts: "",
  prizes: "",
  enabled: false,
};

function toForm(item: any) {
  return {
    badge: item.badge ?? "",
    title: item.title ?? "",
    headline: item.headline ?? "",
    body: item.body ?? "",
    ctaLabel: item.ctaLabel || ANNOUNCEMENT_LABELS.defaultCta,
    ctaHint: item.ctaHint || ANNOUNCEMENT_LABELS.defaultHint,
    whatsappNumber: item.whatsappNumber ?? "",
    deadline: toDateTimeLocal(item.deadline),
    facts: factsToLines(item.facts ?? []),
    prizes: prizesToLines(item.prizes ?? []),
    enabled: !!item.enabled,
  };
}

export default function AnnouncementManager() {
  const utils = trpc.useUtils();
  const list = trpc.admin.announcements.useQuery(undefined, { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const rows = list.data ?? [];
  // The trainer almost always edits the newest announcement, so start there.
  const newest = rows[0];
  useEffect(() => {
    if (editingId === null && newest) setForm(toForm(newest));
  }, [editingId, newest]);

  const refresh = () => {
    utils.admin.announcements.invalidate();
    utils.site.announcement.invalidate();
  };

  const save = trpc.admin.saveAnnouncement.useMutation({
    onSuccess: () => {
      toast.success(form.enabled ? "تم نشر الإعلان في الموقع" : "تم حفظ الإعلان (مخفي)");
      setEditingId(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const toggle = trpc.admin.setAnnouncementEnabled.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.enabled ? "الإعلان ظاهر في الموقع" : "الإعلان اتخفي من الموقع");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الإعلان");
      setEditingId(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const saving = save.isPending;
  const canSave = form.title.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    save.mutate({
      ...(editingId ? { id: editingId } : {}),
      badge: form.badge,
      title: form.title,
      headline: form.headline,
      body: form.body,
      ctaLabel: form.ctaLabel,
      ctaHint: form.ctaHint,
      whatsappNumber: form.whatsappNumber,
      deadline: form.deadline,
      enabled: form.enabled,
      facts: linesToFacts(form.facts),
      prizes: linesToPrizes(form.prizes),
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              حالة الإعلان في الموقع
            </span>
            <Badge variant={newest?.enabled ? "default" : "secondary"}>
              {newest?.enabled ? "ظاهر" : "مفيش إعلان ظاهر"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            {newest?.enabled
              ? "الإعلان بيظهر في أول الموقع كل مرة الزائر يفتح الصفحة."
              : "لما مفيش إعلان مفعّل، الموقع هيفتح عادي من غير أي popping. فعّل الإعلان عشان يظهر."}
          </p>
          <Switch
            checked={!!newest?.enabled}
            disabled={!newest || toggle.isPending}
            aria-label="إظهار الإعلان في الموقع"
            onCheckedChange={checked => newest && toggle.mutate({ id: newest.id, enabled: checked })}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{editingId ? "تعديل الإعلان" : "إعلان جديد"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="announcement-title" className="mb-2 block text-sm">
                  العنوان *
                </Label>
                <Input
                  id="announcement-title"
                  value={form.title}
                  onChange={event => setForm({ ...form, title: event.target.value })}
                  placeholder="مسابقة iDeveloper السنوية"
                />
              </div>

              <div>
                <Label htmlFor="announcement-headline" className="mb-2 block text-sm">
                  السطر الثاني <span className="text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  id="announcement-headline"
                  value={form.headline}
                  onChange={event => setForm({ ...form, headline: event.target.value })}
                  placeholder="اكتشف موهبتك في البرمجة"
                />
              </div>

              <div>
                <Label htmlFor="announcement-badge" className="mb-2 block text-sm">
                  الشارة الصغيرة
                </Label>
                <Input
                  id="announcement-badge"
                  value={form.badge}
                  onChange={event => setForm({ ...form, badge: event.target.value })}
                  placeholder="إعلان خاص"
                />
              </div>

              <div>
                <Label htmlFor="announcement-body" className="mb-2 block text-sm">
                  الوصف
                </Label>
                <Textarea
                  id="announcement-body"
                  rows={3}
                  value={form.body}
                  onChange={event => setForm({ ...form, body: event.target.value })}
                  placeholder="اكتب تفاصيل الإعلان هنا"
                />
              </div>

              <div>
                <Label htmlFor="announcement-facts" className="mb-2 block text-sm">
                  النقاط السريعة <span className="text-muted-foreground">(سطر لكل نقطة)</span>
                </Label>
                <Textarea
                  id="announcement-facts"
                  rows={3}
                  value={form.facts}
                  onChange={event => setForm({ ...form, facts: event.target.value })}
                  placeholder={"للأعمار من 8 إلى 16 سنة\nالمشاركة مجانية\nأونلاين بشكل كامل"}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {linesToFacts(form.facts).length}/8 — سيبها فاضية لو مش عايزهم.
                </p>
              </div>

              <div>
                <Label htmlFor="announcement-prizes" className="mb-2 block text-sm">
                  الجوائز <span className="text-muted-foreground">(سطر لكل جائزة: المركز | الجائزة)</span>
                </Label>
                <Textarea
                  id="announcement-prizes"
                  rows={3}
                  value={form.prizes}
                  onChange={event => setForm({ ...form, prizes: event.target.value })}
                  placeholder={"المركز الأول | جهاز لابتوب + رحلة برمجة\nالمركز الثاني | تاش اشتراك لمدة 3 شهور"}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {linesToPrizes(form.prizes).length}/8 — سيبها فاضية لو مش عايزهم.
                </p>
              </div>

              <div>
                <Label htmlFor="announcement-deadline" className="mb-2 block text-sm">
                  آخر موعد للتسجيل <span className="text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  id="announcement-deadline"
                  type="datetime-local"
                  dir="ltr"
                  value={form.deadline}
                  onChange={event => setForm({ ...form, deadline: event.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  سيبه فاضي ومفيش عدّاد. لو التاريخ عدّى، هيظهر بدله رسالة إن التسجيل بدأ.
                </p>
              </div>

              <div>
                <Label htmlFor="announcement-cta" className="mb-2 block text-sm">
                  نص زرار التسجيل
                </Label>
                <Input
                  id="announcement-cta"
                  value={form.ctaLabel}
                  onChange={event => setForm({ ...form, ctaLabel: event.target.value })}
                  placeholder={ANNOUNCEMENT_LABELS.defaultCta}
                />
              </div>

              <div>
                <Label htmlFor="announcement-whatsapp" className="mb-2 block text-sm">
                  رقم واتساب <span className="text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  id="announcement-whatsapp"
                  dir="ltr"
                  value={form.whatsappNumber}
                  onChange={event => setForm({ ...form, whatsappNumber: event.target.value })}
                  placeholder="201101151926"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.whatsappNumber.trim()
                    ? `هيتحوّل لـ ${normalizeWhatsAppNumber(form.whatsappNumber)}`
                    : "فاضي = رقم الأكاديمية الافتراضي."}
                </p>
              </div>

              <div>
                <Label htmlFor="announcement-hint" className="mb-2 block text-sm">
                  سطر تحت الزرار
                </Label>
                <Input
                  id="announcement-hint"
                  value={form.ctaHint}
                  onChange={event => setForm({ ...form, ctaHint: event.target.value })}
                  placeholder={ANNOUNCEMENT_LABELS.defaultHint}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-4">
                <div>
                  <div className="text-sm font-semibold">نشر في الموقع</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    لما يكون مقفول، الإعلان بيتحفظ بس مش بيظهر للزوار.
                  </p>
                </div>
                <Switch
                  checked={form.enabled}
                  aria-label="نشر الإعلان في الموقع"
                  onCheckedChange={checked => setForm({ ...form, enabled: checked })}
                />
              </div>

              <Button className="h-12 w-full rounded-2xl" disabled={!canSave || saving} onClick={submit}>
                {saving ? "بنحفظ…" : editingId ? "حفظ التعديلات" : "نشر إعلان جديد"}
              </Button>
              {editingId && (
                <Button variant="ghost" className="w-full" onClick={reset}>
                  إلغاء التعديل
                </Button>
              )}
              {!editingId && rows.length > 0 && (
                <Button variant="ghost" className="w-full" onClick={() => newest && setForm(toForm(newest))}>
                  تحميل آخر إعلان للتعديل
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>الإعلانات المحفوظة ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                {ANNOUNCEMENT_LABELS.emptyTitle}
              </div>
            ) : (
              <div className="grid gap-3">
                {rows.map(item => (
                  <div key={item.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{item.title}</span>
                          {item.enabled ? (
                            <Badge>ظاهر في الموقع</Badge>
                          ) : (
                            <Badge variant="secondary">مخفي</Badge>
                          )}
                        </div>
                        {item.headline && (
                          <p className="mt-1 text-sm text-muted-foreground">{item.headline}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                          {item.deadline
                            ? `آخر موعد: ${new Date(item.deadline).toLocaleString("en-GB")}`
                            : "مفيش عدّاد"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="تعديل الإعلان"
                          onClick={() => {
                            setEditingId(item.id);
                            setForm(toForm(item));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label="حذف الإعلان"
                          onClick={() => remove.mutate({ id: item.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-5 flex items-start gap-2 rounded-2xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              الموقع بيعرض إعلان واحد بس في كل مرة. لو فعّلت إعلان جديد، أي إعلان تاني بيتقفل تلقائياً.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}