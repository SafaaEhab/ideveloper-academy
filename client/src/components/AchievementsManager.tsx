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

const emptyForm = { title: "", description: "", achievedOn: "", imageUrl: "", tag: "", sortOrder: 0 };

export default function AchievementsManager() {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = trpc.admin.achievements.useQuery(undefined, { retry: false, refetchInterval: LIVE_REFETCH_INTERVAL });
  const uploadReady = trpc.admin.uploadConfigured.useQuery(undefined, { retry: false });
  const canUpload = uploadReady.data?.upload ?? false;

  // Both the admin list and the public home page feed off the same rows.
  const refresh = () => { utils.admin.achievements.invalidate(); utils.site.achievements.invalidate(); };
  const reset = () => { setEditingId(null); setForm(emptyForm); };

  const uploadImage = trpc.admin.uploadAchievementImage.useMutation();
  const create = trpc.admin.createAchievement.useMutation({
    onSuccess: () => { toast.success("Achievement published to the home page"); reset(); refresh(); },
    onError: error => toast.error(error.message),
  });
  const update = trpc.admin.updateAchievement.useMutation({
    onSuccess: () => { toast.success("Achievement updated"); reset(); refresh(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.admin.deleteAchievement.useMutation({
    onSuccess: () => { toast.success("Achievement removed"); reset(); refresh(); },
    onError: error => toast.error(error.message),
  });

  const rows = list.data ?? [];
  const canSave = form.description.trim().length > 0;
  const saving = create.isPending || update.isPending;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) { toast.error(problem); return; }
    try {
      const dataUrl = await prepareImageForUpload(file);
      const { url } = await uploadImage.mutateAsync({ dataUrl });
      setForm(current => ({ ...current, imageUrl: url }));
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That image could not be uploaded.");
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
    const payload = { ...form, sortOrder: Number(form.sortOrder) || 0 };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>{editingId ? "Edit achievement" : "Add achievement"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ImageOff className="h-6 w-6 opacity-40" />
                    No photo selected
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
                  disabled={uploadImage.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="me-2 h-4 w-4" />
                  {uploadImage.isPending ? "Uploading…" : "Upload photo"}
                </Button>
                {form.imageUrl && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label="Remove photo" onClick={() => setForm(current => ({ ...current, imageUrl: "" }))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              {!canUpload && (
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  Uploading is off because <b>CLOUDINARY_API_KEY</b> is missing from the server env. You can still paste a
                  link to an image below.
                </p>
              )}
              <Input
                value={form.imageUrl}
                onChange={event => setForm({ ...form, imageUrl: event.target.value })}
                placeholder="…or paste an image URL"
                dir="ltr"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label htmlFor="achievement-date" className="mb-2 block text-sm">Date shown on the card</Label>
              <Input
                id="achievement-date"
                value={form.achievedOn}
                onChange={event => setForm({ ...form, achievedOn: event.target.value })}
                placeholder="e.g. 28/3/2024 or 2024"
                dir="ltr"
              />
            </div>

            <div>
              <Label htmlFor="achievement-title" className="mb-2 block text-sm">Short title <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="achievement-title"
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })}
                placeholder="e.g. Codeavour 5.0"
              />
            </div>

            <div>
              <Label htmlFor="achievement-tag" className="mb-2 block text-sm">Corner label <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="achievement-tag"
                value={form.tag}
                onChange={event => setForm({ ...form, tag: event.target.value })}
                placeholder="e.g. Winner"
              />
            </div>

            <div>
              <Label htmlFor="achievement-description" className="mb-2 block text-sm">What happened *</Label>
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
              <Label htmlFor="achievement-order" className="mb-2 block text-sm">Order <span className="text-muted-foreground">(lower shows first)</span></Label>
              <Input
                id="achievement-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })}
              />
            </div>

            <Button className="h-12 w-full rounded-2xl" disabled={!canSave || saving} onClick={save}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Publish achievement"}
            </Button>
            {editingId && <Button variant="ghost" className="w-full" onClick={reset}>Cancel edit</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Published on the home page</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nothing published yet. Fill in the form and it appears on the home page right away.
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map(item => (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border/70 p-4">
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
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
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)} aria-label="Edit achievement">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate({ id: item.id })} aria-label="Delete achievement">
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
