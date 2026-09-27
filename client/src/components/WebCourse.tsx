import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Database,
  Eye,
  Globe,
  Lightbulb,
  MousePointerClick,
  Palette,
  RotateCcw,
  Server,
  ShoppingCart,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { webLessons, webTracks, type WebLesson } from "@/data/webCurriculum";
import CertificateClaim from "@/components/CertificateClaim";
import WebCodeRunner from "@/components/WebCodeRunner";
import WebFigure from "@/components/WebFigure";
import { useCourseCertificate } from "@/hooks/useCourseCertificate";
import { CERTIFICATE_COURSES } from "@/lib/certificateCourses";

const text = {
  title: "My Web journey",
  sub: "Learn HTML, CSS, and JavaScript by making real things",
  roadmap: "Web roadmap",
  lesson: "Lesson",
  month: "Month",
  goal: "Today’s goal",
  toolkit: "Toolkit",
  think: "Think first",
  map: "Lesson map",
  mistake: "Common mistake radar",
  example: "Try the example",
  copy: "Copy code",
  mission: "Your mission",
  extra: "Optional extra practice",
  quiz: "Check your understanding",
  result: "Show my result",
  reset: "Reset quiz",
  correct: "Correct answer",
  retry: "Read the guide and try again",
  complete: "Mark lesson complete",
  completed: "lesson completed",
  sessions: "sessions",
  progress: "Your progress",
};

function ElementDiagram() {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-white dark:bg-slate-950">
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-stretch">
        <div className="flex-1 rounded-xl bg-cyan-500/15 px-3 py-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
            1 · Opening tag
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-cyan-700 dark:text-cyan-200">
            &lt;h1&gt;
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-emerald-500/15 px-3 py-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            2 · Content
          </div>
          <div className="mt-2 text-lg font-bold">My First Heading</div>
        </div>
        <div className="flex-1 rounded-xl bg-cyan-500/15 px-3 py-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
            3 · Closing tag
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-cyan-700 dark:text-cyan-200">
            &lt;/h1&gt;
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 bg-muted/40 px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
        Together = one element 🧩
      </div>
    </div>
  );
}

function PageSkeletonDiagram() {
  return (
    <div className="mt-4 rounded-2xl border-2 border-orange-400/60 bg-orange-500/5 p-3">
      <div className="rounded-xl bg-orange-500/15 px-3 py-1 font-mono text-sm font-bold text-orange-700 dark:text-orange-300">
        &lt;html&gt;
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
          <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
            &lt;head&gt;
          </div>
          <div className="mt-2 rounded-lg bg-background/80 px-2 py-1 font-mono text-xs">
            &lt;title&gt; My Page &lt;/title&gt;
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            🧠 Info — not visible
          </div>
        </div>
        <div className="rounded-xl border border-pink-500/40 bg-pink-500/10 p-3">
          <div className="font-mono text-sm font-bold text-pink-700 dark:text-pink-300">
            &lt;body&gt;
          </div>
          <div className="mt-2 rounded-lg bg-background/80 px-2 py-1 font-mono text-xs">
            &lt;h1&gt; Hello! &lt;/h1&gt;
          </div>
          <div className="mt-1 rounded-lg bg-background/80 px-2 py-1 font-mono text-xs">
            &lt;p&gt; My page &lt;/p&gt;
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            👀 Visible — what you see
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionVisual({
  lessonId,
  index,
}: {
  lessonId: string;
  index: number;
}) {
  if (lessonId !== "html-1") return null;
  if (index === 0) {
    const cards = [
      { icon: Globe, label: "Share", color: "bg-sky-500/10 text-sky-600" },
      {
        icon: Users,
        label: "Connect",
        color: "bg-violet-500/10 text-violet-600",
      },
      {
        icon: Eye,
        label: "Show work",
        color: "bg-amber-500/10 text-amber-600",
      },
      {
        icon: ShoppingCart,
        label: "Shop",
        color: "bg-emerald-500/10 text-emerald-600",
      },
    ];
    return (
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map(item => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-white p-4 shadow-sm dark:bg-slate-950"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}
            >
              <item.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-2 font-bold text-cyan-700 dark:text-cyan-300">
            <Palette className="h-5 w-5" /> Front-end 🎨
          </div>
          <div className="mt-2 text-sm">What you SEE</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["HTML", "CSS", "JS"].map(t => (
              <span
                key={t}
                className="rounded-full bg-white px-3 py-1 font-mono text-xs font-bold shadow-sm dark:bg-slate-900"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
          <div className="flex items-center gap-2 font-bold text-violet-700 dark:text-violet-300">
            <Server className="h-5 w-5" /> Back-end ⚙️
          </div>
          <div className="mt-2 text-sm">Hidden logic + data</div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-4 w-4" /> Server · Database
          </div>
        </div>
      </div>
    );
  }
  if (index === 2) {
    const roles = [
      { emoji: "🦴", label: "HTML", sub: "bones" },
      { emoji: "👕", label: "CSS", sub: "clothes" },
      { emoji: "🛹", label: "JS", sub: "moves" },
    ];
    return (
      <div className="mt-4 grid grid-cols-3 gap-2">
        {roles.map(r => (
          <div
            key={r.label}
            className="rounded-2xl border border-border/60 bg-white p-3 text-center shadow-sm dark:bg-slate-950"
          >
            <div className="text-4xl">{r.emoji}</div>
            <div className="mt-2 font-mono text-sm font-bold">{r.label}</div>
            <div className="text-xs text-muted-foreground">{r.sub}</div>
          </div>
        ))}
      </div>
    );
  }
  if (index === 3) return <ElementDiagram />;
  if (index === 4) return <PageSkeletonDiagram />;
  if (index === 5) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm dark:bg-slate-950">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ms-3 flex-1 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
            google.com
          </span>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-xl bg-muted/60 p-3 text-center text-sm font-bold">
            <MousePointerClick className="mx-auto h-5 w-5 text-cyan-600" />
            <div className="mt-1">1 · Right-click</div>
          </div>
          <div className="text-center text-xl">→</div>
          <div className="rounded-xl bg-muted/60 p-3 text-center text-sm font-bold">
            <Zap className="mx-auto h-5 w-5 text-amber-500" />
            <div className="mt-1">2 · Inspect</div>
          </div>
        </div>
        <div className="border-t border-border/60 bg-slate-950 px-4 py-3 font-mono text-xs text-slate-200">
          <span className="text-slate-500">&lt;</span>
          <span className="text-cyan-300">title</span>
          <span className="text-slate-500">&gt;</span>First web page
          <span className="text-slate-500">&lt;/</span>
          <span className="text-cyan-300">title</span>
          <span className="text-slate-500">&gt;</span>
          <span className="ms-2 rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
            ✏️ you can edit!
          </span>
        </div>
      </div>
    );
  }
  return null;
}

type WebCourseProps = {
  studentName?: string | null;
  accessCode?: string | null;
};

export default function WebCourse({ studentName, accessCode }: WebCourseProps) {
  const [activeTrack, setActiveTrack] = useState<WebLesson["track"]>("HTML");
  const [activeId, setActiveId] = useState("html-1");
  const [openSections, setOpenSections] = useState<number[]>([
    0, 1, 2, 3, 4, 5,
  ]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(
    null
  );
  const zoomImage = (src: string, alt: string) => setZoomed({ src, alt });
  const lesson = webLessons.find(item => item.id === activeId) ?? webLessons[0];
  const visibleLessons = useMemo(
    () => webLessons.filter(item => item.track === activeTrack),
    [activeTrack]
  );
  const validCompleted = useMemo(() => {
    const ids = new Set(webLessons.map(item => item.id));
    return completed.filter(id => ids.has(id));
  }, [completed]);
  const progress = Math.round(
    (validCompleted.length / webLessons.length) * 100
  );
  // Progress is kept per student so it survives a reload, and the completion
  // flip (99% → 100%) is what triggers the certificate.
  const progressLoadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!accessCode) return;
    const courseKey = `idev-progress-${accessCode}-Web`;
    if (progressLoadedFor.current !== accessCode) {
      progressLoadedFor.current = accessCode;
      try {
        const raw = localStorage.getItem(courseKey);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        const ids = new Set(webLessons.map(item => item.id));
        setCompleted(
          Array.isArray(parsed)
            ? parsed.filter(
                (item): item is string =>
                  typeof item === "string" && ids.has(item)
              )
            : []
        );
      } catch {
        setCompleted([]);
      }
      return;
    }
    try {
      localStorage.setItem(courseKey, JSON.stringify(completed));
    } catch {
      /* storage unavailable */
    }
  }, [accessCode, completed]);
  const certificateCourse = CERTIFICATE_COURSES.Web;
  const certificate = useCourseCertificate({
    studentName,
    accessCode,
    isComplete: progress === 100,
    course: certificateCourse,
  });
  const answer = answers[lesson.id];
  const isCorrect = answer === lesson.quiz.answer;
  const chooseTrack = (track: WebLesson["track"]) => {
    const first = webLessons.find(item => item.track === track)!;
    setActiveTrack(track);
    setActiveId(first.id);
    setOpenSections(first.sections.map((_, i) => i));
    setSubmitted(false);
  };
  const chooseLesson = (next: WebLesson) => {
    setActiveId(next.id);
    setOpenSections(next.sections.map((_, i) => i));
    setSubmitted(false);
    window.setTimeout(
      () =>
        document
          .getElementById("web-lesson-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      20
    );
  };
  const toggleComplete = () => {
    setCompleted(items =>
      items.includes(lesson.id)
        ? items.filter(id => id !== lesson.id)
        : [...items, lesson.id]
    );
    toast.success("Great job! Your progress was updated");
  };
  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };
  return (
    <section className="mt-10 space-y-7">
      <div className="grid gap-4 md:grid-cols-[1.4fr_.6fr]">
        <Card className="overflow-hidden rounded-[2rem] border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 via-card to-card">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="rounded-full">Web · 6 months</Badge>
                <h2 className="mt-4 text-3xl font-bold">{text.title}</h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  {text.sub}
                </p>
              </div>
              <Sparkles className="hidden h-8 w-8 text-cyan-500 sm:block" />
            </div>
            <div className="mt-7 flex justify-between text-sm">
              <span>{text.progress}</span>
              <b>{progress}%</b>
            </div>
            <Progress value={progress} className="mt-2 h-3" />
            <CertificateClaim
              courseName={certificateCourse.courseName}
              sessionCount={certificateCourse.sessionCount}
              monthCount={certificateCourse.monthCount}
              complete={certificate.canClaim}
              busy={certificate.busy}
              issued={certificate.issued}
              onDownload={certificate.download}
            />
          </CardContent>
        </Card>
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">
                {webLessons.length} {text.sessions}
              </div>
              <div className="text-sm text-muted-foreground">
                HTML · CSS · JavaScript
              </div>
            </div>
          </div>
          <Separator className="my-5" />
          <div className="text-sm text-muted-foreground">
            Every lesson includes a guide, example, activity, and interactive
            question.
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {webTracks.map(track => (
          <button
            key={track.id}
            type="button"
            onClick={() => chooseTrack(track.id as WebLesson["track"])}
            className={`rounded-2xl border p-4 text-start transition ${activeTrack === track.id ? "border-cyan-500 bg-cyan-500/10 shadow-md" : "border-border bg-card hover:border-cyan-500/40"}`}
          >
            <div
              className={`mb-3 h-2 rounded-full bg-gradient-to-r ${track.color}`}
            />
            <div className="font-bold">{track.en}</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              {track.description}
            </div>
          </button>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-cyan-500" />
              {text.roadmap}
            </div>
            <div className="space-y-2">
              {webTracks.map(track => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => chooseTrack(track.id as WebLesson["track"])}
                  className={`w-full rounded-xl border p-3 text-start ${activeTrack === track.id ? "border-cyan-500 bg-cyan-500/10" : "border-border/70"}`}
                >
                  <div className="font-bold">{track.en}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {webLessons.filter(item => item.track === track.id).length}{" "}
                    {text.sessions}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">Track sessions</div>
            <div className="space-y-2">
              {visibleLessons.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseLesson(item)}
                  className={`w-full rounded-xl border p-3 text-start transition ${lesson.id === item.id ? "border-cyan-500 bg-cyan-500/10" : "border-border/70 hover:border-cyan-500/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-cyan-600">
                      {String(item.number).padStart(2, "0")}
                    </span>
                    <CheckCircle2
                      className={`h-4 w-4 ${completed.includes(item.id) ? "text-emerald-500" : "text-muted-foreground"}`}
                    />
                  </div>
                  <div className="mt-2 text-sm font-bold">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
        <section id="web-lesson-detail">
          <Card
            className={`overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br ${lesson.color}`}
          >
            <CardContent className="p-0">
              <div className="border-b border-white/10 bg-card/70 p-7 backdrop-blur md:p-9">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {lesson.track}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {text.month} {lesson.month}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {text.lesson} {lesson.number} / {webLessons.length}
                  </Badge>
                </div>
                <h2 className="mt-5 text-3xl font-bold md:text-5xl">
                  {lesson.title}
                </h2>
                <p className="mt-3 text-lg leading-8 text-muted-foreground">
                  {lesson.subtitle}
                </p>
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-cyan-600" />
                  <div>
                    <div className="text-sm font-bold">Coach tip</div>
                    <p className="mt-1 leading-7 text-muted-foreground">
                      {lesson.intro}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-5 p-7 md:p-9">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
                      {text.goal}
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6">
                      {lesson.intro}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                      {text.toolkit}
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6">
                      {lesson.sections
                        .slice(0, 2)
                        .map(item => item.title)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                      {text.think}
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6">
                      What will the user see, and what changes after they
                      interact?
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-5">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 text-cyan-500" />
                    <div className="font-bold">{text.map}</div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {lesson.sections.map((item, index) => (
                      <div
                        key={item.title}
                        className="flex items-center gap-3 rounded-xl bg-muted/40 p-3"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-slate-900">
                          {item.emoji ?? `0${index + 1}`}
                        </span>
                        <div>
                          <div className="font-mono text-[11px] text-cyan-600">
                            STEP {index + 1}
                          </div>
                          <div className="text-sm font-bold leading-5">
                            {item.title}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {lesson.sections.map((item, index) => {
                  const open = openSections.includes(index);
                  return (
                    <div
                      key={item.title}
                      className="overflow-hidden rounded-2xl border border-border/70 bg-card/70"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSections(current =>
                            open
                              ? current.filter(value => value !== index)
                              : [...current, index]
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 p-5 text-start"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-3xl">
                            {item.emoji ?? index + 1}
                          </span>
                          <span>
                            <span className="block font-mono text-[11px] uppercase tracking-wider text-cyan-600">
                              Step {index + 1}
                            </span>
                            <span className="block text-lg font-bold leading-6">
                              {item.title}
                            </span>
                          </span>
                        </span>
                        {open ? (
                          <ChevronUp className="h-5 w-5 shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 shrink-0" />
                        )}
                      </button>
                      {open && (
                        <div className="border-t border-border/70 p-5 pt-4">
                          <p className="whitespace-pre-line text-base leading-7 text-foreground/90">
                            {item.body}
                          </p>
                          {item.caption && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                              💡 {item.caption}
                            </div>
                          )}
                          <SectionVisual lessonId={lesson.id} index={index} />
                          {item.images && item.images.length > 0 && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {item.images.map(src => (
                                <WebFigure
                                  key={src}
                                  src={src}
                                  alt={item.title}
                                  onZoom={zoomImage}
                                />
                              ))}
                            </div>
                          )}
                          {item.code && (
                            <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 text-slate-100">
                              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm">
                                <span className="flex items-center gap-2">
                                  <Code2 className="h-4 w-4 text-cyan-300" />
                                  {text.example}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-slate-300 hover:bg-white/10 hover:text-white"
                                  onClick={() => copy(item.code!)}
                                >
                                  {text.copy}
                                </Button>
                              </div>
                              <pre className="overflow-x-auto whitespace-pre-wrap p-5 text-sm leading-7">
                                <code>{item.code}</code>
                              </pre>
                            </div>
                          )}
                          {item.code && (
                            <WebCodeRunner
                              code={item.code}
                              lessonId={lesson.id}
                              sectionIndex={index}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-5">
                  <div className="flex items-center gap-2 font-bold text-cyan-700 dark:text-cyan-300">
                    <span className="text-xl">🏠</span> {text.mission}
                  </div>
                  {lesson.id === "html-1" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        { n: "1", t: "Download VS Code", e: "💻" },
                        { n: "2", t: "Create index.html", e: "📄" },
                        { n: "3", t: "Add h1 + p about you", e: "✍️" },
                      ].map(step => (
                        <div
                          key={step.n}
                          className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-950"
                        >
                          <span className="text-2xl">{step.e}</span>
                          <div>
                            <div className="font-mono text-[11px] text-cyan-600">
                              STEP {step.n}
                            </div>
                            <div className="text-sm font-bold leading-5">
                              {step.t}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 leading-7 text-muted-foreground">
                      {lesson.challenge}
                    </p>
                  )}
                  {lesson.id === "html-1" && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {lesson.challenge}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-5">
                  <div className="font-bold text-amber-700 dark:text-amber-300">
                    {text.extra}
                  </div>
                  <p className="mt-2 leading-7 text-muted-foreground">{`Add a creative twist to ${lesson.title}, such as a new color or an interactive message.`}</p>
                </div>
                <Card className="border-border bg-card">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2 font-bold">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      {text.quiz}
                    </div>
                    <p className="font-semibold">{lesson.quiz.question}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {lesson.quiz.options.map((option, index) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setAnswers(current => ({
                              ...current,
                              [lesson.id]: index,
                            }));
                            setSubmitted(false);
                          }}
                          className={`rounded-xl border p-3 text-start transition ${answer === index ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-cyan-500/40"}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => setSubmitted(true)}
                        disabled={answer === undefined}
                      >
                        {text.result}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setAnswers(current => {
                            const next = { ...current };
                            delete next[lesson.id];
                            return next;
                          });
                          setSubmitted(false);
                        }}
                      >
                        <RotateCcw className="me-2 h-4 w-4" />
                        {text.reset}
                      </Button>
                    </div>
                    {submitted && (
                      <div
                        className={`mt-4 rounded-xl p-4 text-sm ${isCorrect ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}
                      >
                        {isCorrect
                          ? `${text.correct}: ${lesson.quiz.explanation}`
                          : text.retry}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Button
                  type="button"
                  className="w-full rounded-2xl"
                  onClick={toggleComplete}
                >
                  {completed.includes(lesson.id) ? (
                    <>
                      <CheckCircle2 className="me-2 h-4 w-4" />
                      {text.completed}
                    </>
                  ) : (
                    text.complete
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
      <Dialog
        open={Boolean(zoomed)}
        onOpenChange={open => !open && setZoomed(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{zoomed?.alt}</DialogTitle>
            <DialogDescription>
              Click anywhere outside the image to close it.
            </DialogDescription>
          </DialogHeader>
          {zoomed && (
            <img
              src={zoomed.src}
              alt={zoomed.alt}
              className="max-h-[75vh] w-full rounded-xl border border-border/60 bg-white object-contain p-2"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
