import { useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { API_BASE_URL } from "@/const";

type Props = {
  groupId: number;
  courses: string[];
  sessions: { id: number; dayOfWeek: number; startTime: string; endTime: string }[];
};

type Submission = {
  id: number;
  studentId: number;
  studentName: string;
  status: "submitted" | "graded";
  late: boolean;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | Date;
  textResponse: string | null;
  codeResponse: string | null;
  fileId: number | null;
  fileName: string | null;
};

function SubmissionGrader({
  submission,
  maxGrade,
  onSaved,
}: {
  submission: Submission;
  maxGrade: number;
  onSaved: () => void;
}) {
  const [grade, setGrade] = useState(submission.grade == null ? "" : String(submission.grade));
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const gradeMutation = trpc.instructor.gradeSubmission.useMutation({
    onSuccess: () => {
      toast.success("Grade saved");
      onSaved();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="mt-3 rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{submission.studentName}</span>
        <Badge variant={submission.status === "graded" ? "default" : "secondary"}>
          {submission.status === "graded" ? "Graded" : "Submitted"}
        </Badge>
        {submission.late ? <Badge variant="destructive">Late</Badge> : null}
        <span className="text-xs text-muted-foreground">
          {new Date(submission.submittedAt).toLocaleString()}
        </span>
      </div>
      {submission.textResponse ? (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-sm">{submission.textResponse}</p>
      ) : null}
      {submission.codeResponse ? (
        <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-muted/50 p-3 text-xs" dir="ltr">{submission.codeResponse}</pre>
      ) : null}
      {submission.fileId ? (
        <a
          href={`${API_BASE_URL}/api/assignment-files/${submission.fileId}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> {submission.fileName}
        </a>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor={`grade-${submission.id}`} className="mb-1 block text-xs">Grade / {maxGrade}</Label>
          <Input
            id={`grade-${submission.id}`}
            type="number"
            min={0}
            max={maxGrade}
            value={grade}
            onChange={event => setGrade(event.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor={`feedback-${submission.id}`} className="mb-1 block text-xs">Feedback</Label>
          <Textarea
            id={`feedback-${submission.id}`}
            value={feedback}
            onChange={event => setFeedback(event.target.value)}
            rows={1}
            className="min-h-10 rounded-xl"
            placeholder="Optional feedback"
          />
        </div>
        <Button
          type="button"
          className="rounded-xl"
          disabled={gradeMutation.isPending || grade === ""}
          onClick={() => {
            const value = Number(grade);
            if (!Number.isInteger(value) || value < 0 || value > maxGrade) {
              toast.error(`Enter a grade between 0 and ${maxGrade}`);
              return;
            }
            gradeMutation.mutate({ submissionId: submission.id, grade: value, feedback });
          }}
        >
          {gradeMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
          {gradeMutation.isPending ? "Saving…" : submission.status === "graded" ? "Update grade" : "Grade"}
        </Button>
      </div>
    </div>
  );
}

export default function InstructorAssignments({ groupId, courses, sessions }: Props) {
  const utils = trpc.useUtils();
  const list = trpc.instructor.assignments.useQuery({ groupId }, {
    retry: false,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
  const create = trpc.instructor.createAssignment.useMutation({
    onSuccess: () => {
      toast.success("Assignment created");
      setOpen(false);
      reset();
      utils.instructor.assignments.invalidate({ groupId });
    },
    onError: error => toast.error(error.message),
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [course, setCourse] = useState(courses[0] ?? "Python");
  const [sessionId, setSessionId] = useState("none");
  const [dueAt, setDueAt] = useState("");
  const [maxGrade, setMaxGrade] = useState("100");

  const reset = () => {
    setTitle("");
    setInstructions("");
    setCourse(courses[0] ?? "Python");
    setSessionId("none");
    setDueAt("");
    setMaxGrade("100");
  };

  const submit = () => {
    if (title.trim().length < 2) {
      toast.error("Write a title");
      return;
    }
    if (instructions.trim().length < 10) {
      toast.error("Write the assignment instructions");
      return;
    }
    const parsedMax = Number(maxGrade);
    if (!Number.isInteger(parsedMax) || parsedMax < 1) {
      toast.error("Max grade must be a positive number");
      return;
    }
    create.mutate({
      groupId,
      course: course as "Scratch" | "Robotics" | "Web" | "Python",
      sessionId: sessionId === "none" ? null : Number(sessionId),
      title: title.trim(),
      instructions: instructions.trim(),
      dueAt,
      maxGrade: parsedMax,
    });
  };

  const assignments = list.data?.assignments ?? [];

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Assignments
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Create homework, review submissions, and record grades. Totals feed the Homework figure in Performance.
          </p>
        </div>
        <Button type="button" className="rounded-2xl" onClick={() => setOpen(value => !value)}>
          <Plus className="me-2 h-4 w-4" />
          New assignment
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="assignment-title" className="mb-1 block text-xs">Title *</Label>
                <Input id="assignment-title" value={title} onChange={event => setTitle(event.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="assignment-instructions" className="mb-1 block text-xs">Instructions *</Label>
                <Textarea id="assignment-instructions" value={instructions} onChange={event => setInstructions(event.target.value)} rows={3} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Course</Label>
                <Select value={course} onValueChange={setCourse}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {courses.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Session (optional)</Label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific session</SelectItem>
                    {sessions.map(session => (
                      <SelectItem key={session.id} value={String(session.id)}>
                        {`Session #${session.id} · ${session.startTime}–${session.endTime}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignment-due" className="mb-1 block text-xs">Due date (optional)</Label>
                <Input id="assignment-due" type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} className="h-10 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="assignment-max" className="mb-1 block text-xs">Max grade</Label>
                <Input id="assignment-max" type="number" min={1} max={1000} value={maxGrade} onChange={event => setMaxGrade(event.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" className="rounded-xl" disabled={create.isPending} onClick={submit}>
                {create.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Plus className="me-2 h-4 w-4" />}
                {create.isPending ? "Creating…" : "Create assignment"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : null}

        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading assignments…</p>
        ) : list.isError ? (
          <p className="text-sm text-destructive">Could not load assignments.</p>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No assignments yet. Create the first one above.
          </div>
        ) : (
          assignments.map(assignment => (
            <div key={assignment.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold">{assignment.title}</h3>
                <Badge variant="secondary">{assignment.course}</Badge>
                <span className="text-xs text-muted-foreground">
                  {assignment.dueAt ? `Due ${new Date(assignment.dueAt).toLocaleString()}` : "No deadline"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {assignment.submissions.length} submission{assignment.submissions.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{assignment.instructions}</p>
              {assignment.submissions.length === 0 ? (
                <p className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  No student has submitted this assignment yet.
                </p>
              ) : (
                assignment.submissions.map(submission => (
                  <SubmissionGrader
                    key={submission.id}
                    submission={submission as Submission}
                    maxGrade={assignment.maxGrade}
                    onSaved={() => utils.instructor.assignments.invalidate({ groupId })}
                  />
                ))
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
