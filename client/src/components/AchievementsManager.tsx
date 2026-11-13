// @ts-check
/**
 * Admin panel for الإنجازات — the achievements shown on the home page.
 *
 * The trainer fills in the text and the date, and either picks a photo (which is
 * uploaded to Cloudinary from here) or pastes an image URL that already exists.
 * Nothing needs a deploy: saving shows up on the home page immediately.
 */
import { useRef, useState } from "react";
import { ImageOff, Pencil, Trash2, Trophy, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { checkImageFile, prepareImageForUpload } from "@/lib/imageUpload";
import SafeImage from "@/components/SafeImage";
import { validateImageSource } from "@shared/validation";

const IMAGE_VALIDATION_MESSAGE =
  "أدخل رابط HTTPS صالحاً أو مساراً يبدأ بـ /images/";

const emptyForm = { title: "", description: "", achievedOn: "", imageUrl: "", tag: "", sortOrder: 0 };

export default function AchievementsManager() {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = trpc.admin.achievements.useQuery(undefined, { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL });
  const uploadReady = trpc.admin.uploadConfigured.useQuery(undefined, { retry: false });

  // Both the admin list and the public home page feed off the same rows.
  const refresh = () => { utils.admin.achievements.invalidate(); utils.site.achievements.invalidate(); };
  const reset = () => { setEditingId(null); setForm(emptyForm); };

  const uploadImage = trpc.admin.uploadAchievementImage.useMutation();
  const create = trpc.admin.createAchievement.useMutation({
    onSuccess: () => { toast.success("تم نشر الإنجاز على الصفحة الرئيسية"); reset(); refresh(); },
    onError: error => toast.error(error.message),
  });
  const update = trpc.admin.updateAchievement.useMutation({
    onSuccess: () => { toast.success("تم تحديث الإنجاز"); reset(); refresh(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.deleteAchievement.useMutation({
    onSuccess: () => { toast.success("تم حذف الإنجاز"); reset(); refresh(); },
    onError: error => toast.error(error.message),
  });

  const rows = list.data ?? [];
  const imageValidation = validateImageSource(form.imageUrl);
  const canSave =
    form.description.trim().length > 0 && imageValidation.ok;
  const saving = create.isPending || update.isPending;
  const missingKeys = uploadReady.data?.missing ?? [];
  const canUpload = uploadReady.data?.upload ?? false;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) { toast.error(problem); return; }
    try {
      const dataUrl = await prepareImageForUpload(file);
      const { url } = await uploadImage.mutateAsync({ dataUrl });
      setForm(current => ({ ...current, imageUrl: url }));
      toast.success("تم رفع الصورة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    }
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      achievedOn: item.achievedOn || "",
      imageUrl: item.imageUrl || "",
      tag: item.tag || "",
      sortOrder: item.sortOrder ?? 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = () => {
    const validation = validateImageSource(form.imageUrl);
    if (!validation.ok) {
      toast.error(IMAGE_VALIDATION_MESSAGE);
      return;
    }
    const payload = { ...form, imageUrl: validation.value ?? "", sortOrder: Number(form.sortOrder) || 0 };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>{editingId ? "تعديل الإنجاز" : "إضافة إنجاز"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الصورة</Label>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40">
                {form.imageUrl ? (
                  <SafeImage src={form.imageUrl} alt="معاينة الصورة" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ImageOff className="h-6 w-6 opacity-40" />
                    لم يتم اختيار صورة
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={event => { pickImage(event.target.files?.[0]); event.target.value = ""; }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl"
                  disabled={uploadImage.isPending || uploadReady.isLoading || !canUpload}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="me-2 h-4 w-4" />
                  {uploadImage.isPending ? "جارٍ الرفع…" : "رفع صورة"}
                </Button>
                {form.imageUrl && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label="إزالة الصورة" onClick={() => setForm(current => ({ ...current, imageUrl: "" }))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              {!canUpload && (
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  الرفع متوقف حتى يتوفر على السيرفر:{" "}
                  <b>{missingKeys.length > 0 ? missingKeys.join(", ") : "مفاتيح Cloudinary"}</b>. يمكنك لصق
                  رابط صورة بالأسفل.
                </p>
              )}
              <Input
                value={form.imageUrl}
                onChange={event => setForm({ ...form, imageUrl: event.target.value })}
                placeholder="https://… أو /images/…"
                dir="ltr"
                aria-invalid={!imageValidation.ok}
                aria-describedby="achievement-image-error"
                className="h-10 rounded-xl text-xs"
              />
              {!imageValidation.ok && (
                <p id="achievement-image-error" className="text-xs text-destructive">
                  {IMAGE_VALIDATION_MESSAGE}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="achievement-date" className="mb-2 block text-sm">التاريخ المعروض على البطاقة</Label>
              <Input
                id="achievement-date"
                value={form.achievedOn}
                onChange={event => setForm({ ...form, achievedOn: event.target.value })}
                placeholder="مثال: 28/3/2024 أو 2024"
                dir="ltr"
              />
            </div>

            <div>
              <Label htmlFor="achievement-title" className="mb-2 block text-sm">عنوان مختصر <span className="text-muted-foreground">(اختياري)</span></Label>
              <Input
                id="achievement-title"
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })}
                placeholder="مثال: Codeavour 5.0"
              />
            </div>

            <div>
              <Label htmlFor="achievement-tag" className="mb-2 block text-sm">شارة الزاوية <span className="text-muted-foreground">(اختياري)</span></Label>
              <Input
                id="achievement-tag"
                value={form.tag}
                onChange={event => setForm({ ...form, tag: event.target.value })}
                placeholder="مثال: الفائز"
              />
            </div>

            <div>
              <Label htmlFor="achievement-description" className="mb-2 block text-sm">ماذا حدث؟ *</Label>
              <Textarea
                id="achievement-description"
                rows={4}
                dir="auto"
                value={form.description}
                onChange={event => setForm({ ...form, description: event.target.value })}
                placeholder="اكتب وصف الإنجاز هنا"
              />
            </div>

            <div>
              <Label htmlFor="achievement-order" className="mb-2 block text-sm">الترتيب <span className="text-muted-foreground">(الأقل يظهر أولاً)</span></Label>
              <Input
                id="achievement-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })}
              />
            </div>

            <Button className="h-12 w-full rounded-2xl" disabled={!canSave || saving} onClick={save}>
              {saving ? "جارٍ الحفظ…" : editingId ? "حفظ التعديلات" : "نشر الإنجاز"}
            </Button>
            {editingId && <Button variant="ghost" className="w-full" onClick={reset}>إلغاء التعديل</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle>المنشور على الصفحة الرئيسية</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              لا يوجد إنجاز منشور بعد. املأ النموذج وسيظهر على الصفحة الرئيسية فوراً.
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map(item => (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border/70 p-4">
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {item.imageUrl
                      ? <SafeImage src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      : <Trophy className="h-5 w-5 text-muted-foreground opacity-40" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.achievedOn && <span className="text-xs font-bold text-primary" dir="ltr">{item.achievedOn}</span>}
                      {item.title && <span className="text-xs font-semibold">{item.title}</span>}
                      {item.tag && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{item.tag}</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" dir="auto">{item.description}</p>
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)} aria-label="تعديل الإنجاز">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate({ id: item.id })} aria-label="حذف الإنجاز">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
