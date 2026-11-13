import { useState } from "react";
import { GraduationCap, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { PHONE_VALIDATION_MESSAGE, validateOptionalPhone } from "@shared/validation";
import { DAY_LABELS_SHORT_AR, formatTimeRangeAr } from "@/lib/schedule";

type InstructorRow = {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  active: boolean;
  sessionCount: number;
  groups: { id: number; name: string }[];
  sessions: {
    id: number;
    groupName: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location: string | null;
  }[];
};

type Draft = {
  name: string;
  email: string;
  password: string;
  phone: string;
  title: string;
};

const emptyDraft: Draft = { name: "", email: "", password: "", phone: "", title: "" };
const MIN_PASSWORD_LENGTH = 8;

export default function InstructorsManager() {
  const utils = trpc.useUtils();
  const instructors = trpc.admin.instructors.useQuery(undefined, {
    retry: false,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<InstructorRow | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [editActive, setEditActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<InstructorRow | null>(null);

  const refresh = () => {
    utils.admin.instructors.invalidate();
    utils.admin.groupSessions.invalidate();
  };

  const createInstructor = trpc.admin.createInstructor.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة المدرب — يمكنه تسجيل الدخول من صفحة الدخول الآن");
      setDraft(emptyDraft);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const updateInstructor = trpc.admin.updateInstructor.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المدرب");
      setEditing(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const deleteInstructor = trpc.admin.deleteInstructor.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المدرب");
      setConfirmDelete(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const canCreate =
    draft.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email.trim()) &&
    draft.password.length >= MIN_PASSWORD_LENGTH &&
    validateOptionalPhone(draft.phone).ok;

  const startEdit = (instructor: InstructorRow) => {
    setEditing(instructor);
    setEditDraft({
      name: instructor.name,
      email: instructor.email,
      password: "",
      phone: instructor.phone ?? "",
      title: instructor.title ?? "",
    });
    setEditActive(instructor.active);
  };

  const saveEdit = () => {
    if (!editing) return;
    if (editDraft.name.trim().length < 2) {
      toast.error("اكتب اسم المدرب");
      return;
    }
    if (editDraft.password && editDraft.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`كلمة المرور الجديدة تحتاج ${MIN_PASSWORD_LENGTH} أحرف على الأقل`);
      return;
    }
    if (!validateOptionalPhone(editDraft.phone).ok) {
      toast.error(PHONE_VALIDATION_MESSAGE);
      return;
    }
    updateInstructor.mutate({
      id: editing.id,
      name: editDraft.name.trim(),
      email: editDraft.email.trim(),
      password: editDraft.password ? editDraft.password : "",
      phone: editDraft.phone.trim(),
      title: editDraft.title.trim(),
      active: editActive,
    });
  };

  const toggleActive = (instructor: InstructorRow, active: boolean) => {
    updateInstructor.mutate({
      id: instructor.id,
      name: instructor.name,
      email: instructor.email,
      phone: instructor.phone ?? "",
      title: instructor.title ?? "",
      active,
    });
  };

  const rows = (instructors.data ?? []) as InstructorRow[];

  return (
    <div className="grid gap-6 xl:grid-cols-[370px_1fr]">
      <Card className="admin-card h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-primary" />
            إضافة مدرب جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-semibold" htmlFor="instructor-name">
                الاسم الكامل *
              </Label>
              <Input
                id="instructor-name"
                value={draft.name}
                maxLength={160}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
                placeholder="مثال: أ. سلمى"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold" htmlFor="instructor-email">
                البريد الإلكتروني *
              </Label>
              <Input
                id="instructor-email"
                type="email"
                autoComplete="off"
                value={draft.email}
                onChange={event => setDraft({ ...draft, email: event.target.value })}
                placeholder="teacher@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold" htmlFor="instructor-password">
                كلمة المرور *
              </Label>
              <Input
                id="instructor-password"
                type="password"
                autoComplete="new-password"
                value={draft.password}
                onChange={event => setDraft({ ...draft, password: event.target.value })}
                placeholder={`${MIN_PASSWORD_LENGTH} أحرف على الأقل`}
              />
              <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                تُستخدم لتسجيل الدخول من صفحة الدخول، وتُشفّر ولا يمكن عرضها مرة أخرى.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-semibold" htmlFor="instructor-phone">
                  الهاتف
                </Label>
                <Input
                  id="instructor-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={event => setDraft({ ...draft, phone: event.target.value })}
                  placeholder="اختياري"
                  dir="ltr"
                  aria-invalid={!validateOptionalPhone(draft.phone).ok}
                />
                {!validateOptionalPhone(draft.phone).ok ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {PHONE_VALIDATION_MESSAGE}
                  </p>
                ) : null}
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold" htmlFor="instructor-title">
                  المادة التي يدرّسها
                </Label>
                <Input
                  id="instructor-title"
                  value={draft.title}
                  onChange={event => setDraft({ ...draft, title: event.target.value })}
                  placeholder="بايثون، الروبوتات…"
                />
              </div>
            </div>
            <Button
              className="h-11 w-full rounded-xl"
              disabled={!canCreate || createInstructor.isPending}
              onClick={() =>
                createInstructor.mutate({
                  name: draft.name.trim(),
                  email: draft.email.trim(),
                  password: draft.password,
                  phone: draft.phone.trim(),
                  title: draft.title.trim(),
                })
              }
            >
              <Plus className="me-2 h-4 w-4" />
              {createInstructor.isPending ? "جارٍ الإضافة…" : "إضافة المدرب"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card min-w-0">
        <CardHeader>
          <CardTitle className="text-base">
            المدربون <span className="text-muted-foreground">({rows.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {instructors.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">لا يوجد مدربون بعد</p>
              <p className="mt-1 text-sm text-muted-foreground">
                أضف أول مدرب ثم أسنده إلى حصة من جدول المواعيد.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map(instructor => (
                <div key={instructor.id} className="admin-card-soft p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-extrabold text-primary">
                        {instructor.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-bold">{instructor.name}</span>
                          <Badge variant={instructor.active ? "default" : "secondary"}>
                            {instructor.active ? "نشط" : "موقوف"}
                          </Badge>
                          {instructor.title ? (
                            <Badge variant="outline">{instructor.title}</Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">
                          {instructor.email}
                          {instructor.phone ? ` · ${instructor.phone}` : ""}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {instructor.sessionCount === 0
                            ? "لا توجد حصص مسندة بعد"
                            : `${instructor.sessionCount} حصة أسبوعية`}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={instructor.active}
                        disabled={updateInstructor.isPending}
                        onCheckedChange={active => toggleActive(instructor, active)}
                        aria-label={`${instructor.active ? "إيقاف" : "تفعيل"} ${instructor.name}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => startEdit(instructor)}
                      >
                        <Pencil className="me-1.5 h-3.5 w-3.5" />
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setConfirmDelete(instructor)}
                        aria-label={`حذف ${instructor.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {instructor.groups.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                      {instructor.groups.map(group => (
                        <span
                          key={group.id}
                          className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {group.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-6 text-muted-foreground">
                      الإسناد يتم من جدول المواعيد — افتح الحصة واختر المدرب.
                      لوحة المدرب تتحدث تلقائياً.
                    </p>
                  )}

                  {instructor.sessions.length > 0 ? (
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {instructor.sessions.map(session => (
                        <div key={session.id} className="truncate">
                          {session.groupName} · {DAY_LABELS_SHORT_AR[session.dayOfWeek]}{" "}
                          {formatTimeRangeAr(session.startTime, session.endTime)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المدرب</DialogTitle>
            <DialogDescription>
              حدّث الملف الشخصي أو أعد تعيين كلمة المرور أو أوقف الحساب.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-semibold" htmlFor="edit-name">
                الاسم الكامل *
              </Label>
              <Input
                id="edit-name"
                value={editDraft.name}
                onChange={event => setEditDraft({ ...editDraft, name: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold" htmlFor="edit-email">
                البريد الإلكتروني *
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editDraft.email}
                onChange={event => setEditDraft({ ...editDraft, email: event.target.value })}
                dir="ltr"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold" htmlFor="edit-password">
                كلمة مرور جديدة
              </Label>
              <Input
                id="edit-password"
                type="password"
                autoComplete="new-password"
                value={editDraft.password}
                onChange={event => setEditDraft({ ...editDraft, password: event.target.value })}
                placeholder="اتركها فارغة للإبقاء على كلمة المرور الحالية"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-semibold" htmlFor="edit-phone">
                  الهاتف
                </Label>
                <Input
                  id="edit-phone"
                  value={editDraft.phone}
                  onChange={event => setEditDraft({ ...editDraft, phone: event.target.value })}
                  dir="ltr"
                  aria-invalid={!validateOptionalPhone(editDraft.phone).ok}
                />
                {!validateOptionalPhone(editDraft.phone).ok ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {PHONE_VALIDATION_MESSAGE}
                  </p>
                ) : null}
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold" htmlFor="edit-title">
                  المادة التي يدرّسها
                </Label>
                <Input
                  id="edit-title"
                  value={editDraft.title}
                  onChange={event => setEditDraft({ ...editDraft, title: event.target.value })}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 text-sm">
              <span>
                <span className="block font-semibold">الحساب نشط</span>
                <span className="block text-xs leading-5 text-muted-foreground">
                  إيقافه يغلق لوحة المدرب فوراً مع الاحتفاظ بسجله.
                </span>
              </span>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button disabled={updateInstructor.isPending} onClick={saveEdit}>
              {updateInstructor.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={open => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>حذف المدرب؟</DialogTitle>
            <DialogDescription>
              {confirmDelete
                ? `"${confirmDelete.name}" سيفقد الوصول إلى لوحة المدرب وستصبح حصصه غير مسندة. يتم الاحتفاظ بالتقييمات المسجلة.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={deleteInstructor.isPending}
              onClick={() =>
                confirmDelete && deleteInstructor.mutate({ id: confirmDelete.id })
              }
            >
              {deleteInstructor.isPending ? "جارٍ الحذف…" : "حذف المدرب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
