import { useState } from "react";
import { BarChart3, CalendarClock, CalendarDays, Copy, DatabaseBackup, GraduationCap, LayoutDashboard, Megaphone, Plus, ShieldCheck, Trash2, Trophy, Users, WandSparkles, ClipboardList, Layers } from "lucide-react";
import AchievementsManager from "@/components/AchievementsManager";
import AdminGate from "@/components/AdminGate";
import BackupManager from "@/components/BackupManager";
import AdminAnalytics from "@/components/performance/AdminAnalytics";
import AnnouncementManager from "@/components/AnnouncementManager";
import CoursesManager from "@/components/CoursesManager";
import DashboardLayout from "@/components/DashboardLayout";
import InstructorsManager from "@/components/InstructorsManager";
import LeadsManager from "@/components/leads/LeadsManager";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation, useSearchParams } from "wouter";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PHONE_VALIDATION_MESSAGE, validatePhone } from "@shared/validation";

type Course = "Scratch" | "Robotics" | "Web" | "Python";
const courses: Course[] = ["Scratch", "Robotics", "Web", "Python"];

export default function Admin() {
  const { user, loading } = useAuth();
  // Hooks must run unconditionally, so the admin queries below need this gate —
  // without it they fire while the login card is showing and log permission errors.
  const isAdmin = user?.role === "admin";
  // The roster and the request queue are the owner's alone. `isOwner` comes from
  // `auth.me`, which decides it server-side, so an invited admin's client has no
  // way to talk itself into the tab — and the endpoints refuse it regardless.
  const isOwner = user?.isOwner === true;
  // The sidebar navigates with `?tab=`, so the open screen has to come from the
  // URL — otherwise every sidebar link changes the address bar and nothing else.
type AdminTab = "overview" | "analytics" | "students" | "instructors" | "schedule" | "courses" | "leads" | "achievements" | "announcements" | "backup" | "admins";
const ADMIN_TABS: AdminTab[] = ["overview", "analytics", "students", "instructors", "schedule", "courses", "leads", "achievements", "announcements", "backup", "admins"];
// `useLocation` hands back the bare pathname, so the query string has to come
// from `useSearchParams` — the same source DashboardLayout reads.
const [, setLocation] = useLocation();
const [searchParams] = useSearchParams();
const requested = searchParams.get("tab");
// A non-owner who types `?tab=admins` lands on the overview instead of a screen
// they are not allowed to see.
const tab: AdminTab = ADMIN_TABS.includes(requested as AdminTab) && (requested !== "admins" || isOwner) ? (requested as AdminTab) : "overview";
const setTab = (next: AdminTab) => setLocation(next === "overview" ? "/admin" : `/admin?tab=${next}`);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentForm, setStudentForm] = useState({ name: "", email: "", phone: "", groupId: "", status: "active" as "active" | "paused", courses: ["Python"] as Course[] });
  const stats = trpc.admin.stats.useQuery(undefined, { retry: false, enabled: isAdmin, refetchInterval: LIVE_REFETCH_INTERVAL });
  const courseOfferings = trpc.admin.courseOfferings.useQuery(undefined, { retry: false, enabled: isAdmin, refetchInterval: LIVE_REFETCH_INTERVAL });
  const students = trpc.admin.students.useQuery(undefined, { retry: false, enabled: isAdmin, refetchInterval: LIVE_REFETCH_INTERVAL });
  const groups = trpc.admin.groups.useQuery(undefined, { retry: false, enabled: isAdmin, refetchInterval: LIVE_REFETCH_INTERVAL });
  const admins = trpc.admin.admins.useQuery(undefined, { retry: false, enabled: isOwner, refetchInterval: LIVE_REFETCH_INTERVAL });
  const requests = trpc.admin.accessRequests.useQuery(undefined, { retry: false, enabled: isOwner, refetchInterval: LIVE_REFETCH_INTERVAL });
  const utils = trpc.useUtils();
  const [adminEmail, setAdminEmail] = useState("");
  const invalidateAdminLists = () => { utils.admin.admins.invalidate(); utils.admin.accessRequests.invalidate(); };
  const addAdmin = trpc.admin.addAdmin.useMutation({ onSuccess: () => { toast.success("Admin access granted"); setAdminEmail(""); invalidateAdminLists(); }, onError: e => toast.error(e.message) });
  const removeAdmin = trpc.admin.removeAdmin.useMutation({ onSuccess: () => { toast.success("Admin access removed"); invalidateAdminLists(); }, onError: e => toast.error(e.message) });
  const approveAccess = trpc.admin.approveAccess.useMutation({ onSuccess: () => { toast.success("Access approved — they can open the workspace now"); invalidateAdminLists(); }, onError: e => toast.error(e.message) });
  const dismissAccess = trpc.admin.dismissAccess.useMutation({ onSuccess: () => { toast.success("Request dismissed"); invalidateAdminLists(); }, onError: e => toast.error(e.message) });

  const resetStudent = () => { setStudentId(null); setStudentForm({ name: "", email: "", phone: "", groupId: "", status: "active", courses: ["Python"] }); };
  const createStudent = trpc.admin.createStudent.useMutation({ onSuccess: data => { toast.success(`Student created — access code: ${data.accessCode}`); resetStudent(); utils.admin.students.invalidate(); utils.admin.stats.invalidate(); }, onError: e => toast.error(e.message) });
  const updateStudent = trpc.admin.updateStudent.useMutation({ onSuccess: () => { toast.success("Student updated"); resetStudent(); utils.admin.students.invalidate(); }, onError: e => toast.error(e.message) });
const deleteStudent = trpc.admin.deleteStudent.useMutation({ onSuccess: () => { toast.success("Student removed"); utils.admin.students.invalidate(); utils.admin.stats.invalidate(); }, onError: e => toast.error(e.message) });
  const toggleCourse = (course: Course) => setStudentForm(s => ({ ...s, courses: s.courses.includes(course) ? s.courses.filter(c => c !== course) : [...s.courses, course] }));
  const startStudentEdit = (student: any) => { setStudentId(student.id); setStudentForm({ name: student.name, email: student.email || "", phone: student.phone || "", groupId: student.groupId ? String(student.groupId) : "", status: student.status, courses: student.courses?.length ? student.courses : ["Python"] }); };
  const nav = [{ id: "overview" as const, label: "Workspace", icon: LayoutDashboard }, { id: "analytics" as const, label: "Performance", icon: BarChart3 }, { id: "students" as const, label: "Students", icon: Users }, { id: "leads" as const, label: "العملاء المحتملون", icon: ClipboardList }, { id: "instructors" as const, label: "Instructors", icon: GraduationCap }, { id: "schedule" as const, label: "Timetable", icon: CalendarClock }, { id: "courses" as const, label: "Courses", icon: Layers }, { id: "achievements" as const, label: "Achievements", icon: Trophy }, { id: "announcements" as const, label: "Announcement", icon: Megaphone }, { id: "backup" as const, label: "Data backup", icon: DatabaseBackup }, { id: "admins" as const, label: "Admins", icon: ShieldCheck }].filter(item => item.id !== "admins" || isOwner);
  const offeringByCourse = new Map((courseOfferings.data ?? []).map(item => [item.course, item.status]));
  if (loading) return <div className="flex min-h-screen items-center justify-center p-6"><p className="text-sm text-muted-foreground">Loading workspace...</p></div>;
  // Anyone may open this page; only an admin gets the workspace. Everyone else
  // gets the gate, which offers sign-in for an existing account and a request
  // form for one that has not been approved yet.
  if (!isAdmin) return <AdminGate />;
  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-8 p-3 md:p-5"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="flex items-center gap-2 text-sm font-semibold text-primary"><WandSparkles className="h-4 w-4" />iDeveloper</div><h1 className="mt-2 text-4xl font-bold tracking-tight">Admin workspace</h1><p className="mt-2 text-muted-foreground">Manage students, leads, instructors, the timetable, achievements, and site announcements.</p></div><div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm"><div className="h-2 w-2 rounded-full bg-emerald-400" />Signed in as <b>{user?.name || "Admin"}</b></div></div><div className="flex flex-wrap gap-2">{nav.map(item => <Button key={item.id} variant={tab === item.id ? "default" : "outline"} className="rounded-full" onClick={() => setTab(item.id)}><item.icon className="me-2 h-4 w-4" />{item.label}</Button>)}</div>
  {tab === "overview" && <>
    {(stats.data?.registrationPending ?? 0) > 0 ? (
      <button type="button" onClick={() => setTab("leads")} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-start text-sm font-semibold text-amber-800 transition hover:bg-amber-500/15 dark:text-amber-200">
        <span>{stats.data?.newLeads ?? 0} عميل جديد بانتظار المتابعة{(stats.data?.overdueLeads ?? 0) > 0 ? ` — ${stats.data?.overdueLeads} متأخر في الاتصال` : ""}</span>
        <span className="rounded-full bg-amber-500 px-3 py-1 text-xs text-white">مراجعة</span>
      </button>
    ) : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Users} label="Total students" value={stats.data?.students ?? "—"} /><Stat icon={CalendarDays} label="Active groups" value={stats.data?.groups ?? "—"} /><Stat icon={BarChart3} label="Active learners" value={stats.data?.active ?? "—"} /><Stat icon={ClipboardList} label="عملاء جدد" value={stats.data?.newLeads ?? 0} /></div>
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <Card className="rounded-3xl"><CardHeader><CardTitle>Academy overview</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2">{courses.map((course) => { const status = offeringByCourse.get(course); return <div key={course} className="rounded-2xl border border-border/70 bg-muted/30 p-4"><div className="flex items-center justify-between"><span className="font-semibold">{course}</span><Badge variant={status === "live" ? "default" : "secondary"}>{status === "live" ? "Live" : status === "waiting_list" ? "Waiting list" : status === "coming_soon" ? "Coming soon" : "Loading"}</Badge></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${status === "live" ? "w-3/4 bg-primary" : "w-1/5 bg-muted-foreground/30"}`} /></div></div>; })}</div></CardContent></Card>
      <Card className="rounded-3xl bg-gradient-to-br from-primary/15 to-transparent"><CardHeader><CardTitle>Quick actions</CardTitle></CardHeader><CardContent className="space-y-3"><Button className="h-12 w-full justify-between rounded-2xl" onClick={() => setTab("students")}>Add a new student <Plus className="h-4 w-4" /></Button><Button variant="outline" className="h-12 w-full justify-between rounded-2xl" onClick={() => setTab("leads")}>متابعة العملاء المحتملين <ClipboardList className="h-4 w-4" /></Button><Button variant="outline" className="h-12 w-full justify-between rounded-2xl" onClick={() => setTab("schedule")}>Open the timetable <CalendarClock className="h-4 w-4" /></Button><Button variant="outline" className="h-12 w-full justify-between rounded-2xl" onClick={() => setTab("achievements")}>Publish an achievement <Trophy className="h-4 w-4" /></Button><Button variant="outline" className="h-12 w-full justify-between rounded-2xl" onClick={() => setTab("announcements")}>Post a site announcement <Megaphone className="h-4 w-4" /></Button><Button variant="outline" className="h-12 w-full justify-between rounded-2xl" onClick={() => setTab("backup")}>Download an Excel backup <DatabaseBackup className="h-4 w-4" /></Button></CardContent></Card>
    </div>
  </>}
  {tab === "students" && <div className="grid gap-5 xl:grid-cols-[380px_1fr]"><Card className="rounded-3xl"><CardHeader><CardTitle>{studentId ? "Edit student" : "Add student"}</CardTitle></CardHeader><CardContent><div className="space-y-4"><Field label="Full name"><Input value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="e.g. Lina Ahmed" /></Field><Field label="Email"><Input value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} placeholder="Optional" /></Field><Field label="Phone *"><Input required type="tel" value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} placeholder="e.g. 01012345678" dir="ltr" aria-invalid={!validatePhone(studentForm.phone).ok} />{!validatePhone(studentForm.phone).ok ? <p className="mt-1.5 text-xs text-destructive">{PHONE_VALIDATION_MESSAGE}</p> : null}</Field><Field label="Group"><Select value={studentForm.groupId || "none"} onValueChange={value => setStudentForm({ ...studentForm, groupId: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder="Choose group" /></SelectTrigger><SelectContent><SelectItem value="none">No group yet</SelectItem>{groups.data?.map(group => <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>)}</SelectContent></Select></Field>{studentId && <Field label="Status"><Select value={studentForm.status} onValueChange={value => setStudentForm({ ...studentForm, status: value as "active" | "paused" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem></SelectContent></Select></Field>}<div><Label className="mb-3 block">Courses</Label><div className="grid grid-cols-2 gap-3">{courses.map(course => <label key={course} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm"><Checkbox checked={studentForm.courses.includes(course)} onCheckedChange={() => toggleCourse(course)} />{course}</label>)}</div></div><Button className="h-12 w-full rounded-2xl" disabled={!studentForm.name || !validatePhone(studentForm.phone).ok || !studentForm.courses.length} onClick={() => studentId ? updateStudent.mutate({ id: studentId, ...studentForm, groupId: studentForm.groupId ? Number(studentForm.groupId) : null, courses: studentForm.courses }) : createStudent.mutate({ ...studentForm, groupId: studentForm.groupId ? Number(studentForm.groupId) : null, courses: studentForm.courses })}>{studentId ? "Save changes" : "Create student"}</Button>{studentId && <Button variant="ghost" className="w-full" onClick={resetStudent}>Cancel edit</Button>}<p className="text-xs leading-5 text-muted-foreground">Access codes are generated automatically and never manually entered.</p></div></CardContent></Card><Card className="rounded-3xl"><CardHeader><CardTitle>Students <span className="text-muted-foreground">({students.data?.length ?? 0})</span></CardTitle></CardHeader><CardContent><div className="space-y-3">{students.data?.map(student => <div key={student.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center"><div><div className="font-semibold">{student.name}</div><div className="mt-1 text-sm text-muted-foreground">{student.group?.name || "No group"} · {student.status}</div><div className="mt-2 flex flex-wrap gap-1">{student.courses?.map((course: Course) => <Badge key={course} variant="secondary">{course}</Badge>)}</div><div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2 py-1 font-mono text-xs text-primary">{student.accessCode}<button onClick={() => { navigator.clipboard.writeText(student.accessCode); toast.success("Code copied"); }}><Copy className="h-3 w-3" /></button></div></div><div className="flex self-end gap-1 sm:self-center"><Button variant="outline" size="sm" onClick={() => startStudentEdit(student)}>Edit</Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteStudent.mutate({ id: student.id })}><Trash2 className="h-4 w-4" /></Button></div></div>)}{!students.data?.length && <Empty text="No students yet. Add the first learner from the form." />}</div></CardContent></Card></div>}
  {tab === "instructors" && <InstructorsManager />}{tab === "schedule" && <ScheduleCalendar />}
  {tab === "courses" && <CoursesManager />}
  {tab === "leads" && <LeadsManager />}
  {tab === "analytics" && <AdminAnalytics />}
  {tab === "achievements" && <AchievementsManager />}
  {tab === "announcements" && <AnnouncementManager />}
  {tab === "backup" && <BackupManager />}
  {tab === "admins" && isOwner && <div className="space-y-6">
    <Card className="rounded-3xl border-amber-500/40">
      <CardHeader><CardTitle>Access requests{requests.data?.length ? ` (${requests.data.length})` : ""}</CardTitle></CardHeader>
      <CardContent>
        {requests.data?.length ? (
          <div className="space-y-3">{requests.data.map(request => <div key={request.id} className="flex flex-col gap-4 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="truncate font-semibold">{request.email}</div>{request.name && <div className="mt-0.5 text-sm text-muted-foreground">{request.name}</div>}<div className="mt-1 text-xs text-muted-foreground">Asked {new Date(request.createdAt).toLocaleString()}</div></div><div className="flex shrink-0 gap-2"><Button className="rounded-2xl" disabled={approveAccess.isPending} onClick={() => approveAccess.mutate({ email: request.email })}>Approve</Button><Button variant="outline" className="rounded-2xl" disabled={dismissAccess.isPending} onClick={() => dismissAccess.mutate({ email: request.email })}>Dismiss</Button></div></div>)}</div>
        ) : (
          <Empty text="No one is waiting for access right now." />
        )}
      </CardContent>
    </Card>
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="rounded-3xl"><CardHeader><CardTitle>Add someone directly</CardTitle></CardHeader><CardContent><div className="space-y-4"><Field label="Email address"><Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="teacher@example.com" /></Field><Button className="h-12 w-full rounded-2xl" disabled={!adminEmail.trim() || addAdmin.isPending} onClick={() => addAdmin.mutate({ email: adminEmail.trim() })}>{addAdmin.isPending ? "Granting..." : "Grant access"}</Button></div></CardContent></Card>
      <Card className="rounded-3xl"><CardHeader><CardTitle>Who can open the workspace</CardTitle></CardHeader><CardContent><div className="space-y-3">{admins.data?.length ? admins.data.map(entry => <div key={entry.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4"><div className="min-w-0"><div className="truncate font-semibold">{entry.email}</div><div className="mt-1 text-xs text-muted-foreground">{entry.locked ? "Pinned in ADMIN_EMAILS" : entry.invitedBy ? `Invited by ${entry.invitedBy}` : "Invited"}</div></div>{entry.locked ? <Badge variant="secondary">Owner</Badge> : <Button variant="ghost" size="icon" className="text-destructive" disabled={removeAdmin.isPending} onClick={() => removeAdmin.mutate({ email: entry.email })}><Trash2 className="h-4 w-4" /></Button>}</div>) : <Empty text="No one has access yet." />}</div></CardContent></Card>
    </div>
  </div>}
  </div></DashboardLayout>;
}
function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) { return <Card className="rounded-3xl"><CardContent className="flex items-center gap-4 p-5"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><div><div className="text-3xl font-bold">{value}</div><div className="text-sm text-muted-foreground">{label}</div></div></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="mb-2 block text-sm">{label}</Label>{children}</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{text}</div>; }
