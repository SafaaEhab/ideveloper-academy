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
import { DAY_LABELS_SHORT, formatTimeRange } from "@/lib/schedule";

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

/**
 * Admin → Instructors. Adding someone here creates their sign-in account as
 * well; the password the admin types is hashed server-side and never comes
 * back through any endpoint, so this screen only ever edits it (never shows it).
 */
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
    // The timetable blocks show instructor names, so they refresh with the roster.
    utils.admin.groupSessions.invalidate();
  };

  const createInstructor = trpc.admin.createInstructor.useMutation({
    onSuccess: () => {
      toast.success("Instructor added — they can sign in at /login now");
      setDraft(emptyDraft);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const updateInstructor = trpc.admin.updateInstructor.useMutation({
    onSuccess: () => {
      toast.success("Instructor updated");
      setEditing(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const deleteInstructor = trpc.admin.deleteInstructor.useMutation({
    onSuccess: () => {
      toast.success("Instructor removed");
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
      toast.error("Write the instructor's name");
      return;
    }
    if (editDraft.password && editDraft.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`The new password needs at least ${MIN_PASSWORD_LENGTH} characters`);
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
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Add instructor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm" htmlFor="instructor-name">
                Full name *
              </Label>
              <Input
                id="instructor-name"
                value={draft.name}
                maxLength={160}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
                placeholder="e.g. Ms Salma"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm" htmlFor="instructor-email">
                Email *
              </Label>
              <Input
                id="instructor-email"
                type="email"
                autoComplete="off"
                value={draft.email}
                onChange={event => setDraft({ ...draft, email: event.target.value })}
                placeholder="teacher@example.com"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm" htmlFor="instructor-password">
                Password *
              </Label>
              <Input
                id="instructor-password"
                type="password"
                autoComplete="new-password"
                value={draft.password}
                onChange={event => setDraft({ ...draft, password: event.target.value })}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Used to sign in at /login. It is hashed and cannot be viewed again.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm" htmlFor="instructor-phone">
                  Phone
                </Label>
                <Input
                  id="instructor-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={event => setDraft({ ...draft, phone: event.target.value })}
                  placeholder="Optional"
                  dir="ltr"
                  aria-invalid={!validateOptionalPhone(draft.phone).ok}
                />
                {!validateOptionalPhone(draft.phone).ok ? (
                  <p className="mt-1.5 text-xs text-destructive">{PHONE_VALIDATION_MESSAGE}</p>
                ) : null}
              </div>
              <div>
                <Label className="mb-2 block text-sm" htmlFor="instructor-title">
                  Teaches
                </Label>
                <Input
                  id="instructor-title"
                  value={draft.title}
                  onChange={event => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Python, Robotics…"
                />
              </div>
            </div>
            <Button
              className="h-12 w-full rounded-2xl"
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
              {createInstructor.isPending ? "Adding…" : "Add instructor"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>
            Instructors{rows.length > 0 ? ` (${rows.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {instructors.isLoading ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Loading instructors…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No instructors yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the first one, then assign them to a session in the timetable.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map(instructor => (
                <div
                  key={instructor.id}
                  className="rounded-2xl border border-border/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">{instructor.name}</span>
                        <Badge variant={instructor.active ? "default" : "secondary"}>
                          {instructor.active ? "Active" : "Inactive"}
                        </Badge>
                        {instructor.title ? (
                          <Badge variant="outline">{instructor.title}</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 truncate text-sm text-muted-foreground">
                        {instructor.email}
                        {instructor.phone ? ` · ${instructor.phone}` : ""}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {instructor.sessionCount === 0
                          ? "No sessions assigned yet"
                          : `${instructor.sessionCount} weekly session${instructor.sessionCount === 1 ? "" : "s"}`}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={instructor.active}
                        disabled={updateInstructor.isPending}
                        onCheckedChange={active => toggleActive(instructor, active)}
                        aria-label={`${instructor.active ? "Deactivate" : "Activate"} ${instructor.name}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => startEdit(instructor)}
                      >
                        <Pencil className="me-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setConfirmDelete(instructor)}
                        aria-label={`Delete ${instructor.name}`}
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
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      Assignment comes from the timetable — open a session and pick this
                      instructor. Their dashboard updates automatically.
                    </p>
                  )}

                  {instructor.sessions.length > 0 ? (
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {instructor.sessions.map(session => (
                        <div key={session.id} className="truncate">
                          {session.groupName} · {DAY_LABELS_SHORT[session.dayOfWeek]}{" "}
                          {formatTimeRange(session.startTime, session.endTime)}
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
            <DialogTitle>Edit instructor</DialogTitle>
            <DialogDescription>
              Update the profile, reset the password, or switch the account off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm" htmlFor="edit-name">
                Full name *
              </Label>
              <Input
                id="edit-name"
                value={editDraft.name}
                onChange={event => setEditDraft({ ...editDraft, name: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm" htmlFor="edit-email">
                Email *
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editDraft.email}
                onChange={event => setEditDraft({ ...editDraft, email: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm" htmlFor="edit-password">
                New password
              </Label>
              <Input
                id="edit-password"
                type="password"
                autoComplete="new-password"
                value={editDraft.password}
                onChange={event => setEditDraft({ ...editDraft, password: event.target.value })}
                placeholder="Leave blank to keep the current password"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm" htmlFor="edit-phone">
                  Phone
                </Label>
                <Input
                  id="edit-phone"
                  value={editDraft.phone}
                  onChange={event => setEditDraft({ ...editDraft, phone: event.target.value })}
                  dir="ltr"
                  aria-invalid={!validateOptionalPhone(editDraft.phone).ok}
                />
                {!validateOptionalPhone(editDraft.phone).ok ? (
                  <p className="mt-1.5 text-xs text-destructive">{PHONE_VALIDATION_MESSAGE}</p>
                ) : null}
              </div>
              <div>
                <Label className="mb-2 block text-sm" htmlFor="edit-title">
                  Teaches
                </Label>
                <Input
                  id="edit-title"
                  value={editDraft.title}
                  onChange={event => setEditDraft({ ...editDraft, title: event.target.value })}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 text-sm">
              <span>
                <span className="block font-medium">Account active</span>
                <span className="block text-xs text-muted-foreground">
                  Off immediately closes their dashboard; their history stays intact.
                </span>
              </span>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={updateInstructor.isPending} onClick={saveEdit}>
              {updateInstructor.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={open => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete instructor?</DialogTitle>
            <DialogDescription>
              {confirmDelete
                ? `"${confirmDelete.name}" loses dashboard access and their timetable slots become unassigned. Recorded evaluations are kept.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteInstructor.isPending}
              onClick={() =>
                confirmDelete && deleteInstructor.mutate({ id: confirmDelete.id })
              }
            >
              {deleteInstructor.isPending ? "Deleting…" : "Delete instructor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
