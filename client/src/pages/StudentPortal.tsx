import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Lightbulb,
  LockKeyhole,
  Map,
  Moon,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc, LIVE_REFETCH_INTERVAL } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import {
  allPythonLessons,
  coreLessons,
  curriculumPhases,
  problemSolvingLessons,
  type CurriculumLesson,
} from "@/data/pythonCurriculum";
import {
  allScratchLessons,
  curriculumPhases as scratchPhases,
} from "@/data/scratchCurriculum";
import WebCourse from "@/components/WebCourse";
import PythonRunner from "@/components/PythonRunner";
import CertificateClaim from "@/components/CertificateClaim";
import { useCourseCertificate } from "@/hooks/useCourseCertificate";
import { getCertificateCourse } from "@/lib/certificateCourses";
import ScratchBlocks from "@/components/ScratchBlocks";
import LessonArt, {
  LessonMini,
  MarkMini,
  PYTHON_LOGO,
  PYTHON_PHASES,
  SCRATCH_LOGO,
} from "@/components/LessonArt";
import CurriculumFigure from "@/components/CurriculumFigure";

type Track = "core" | "problem";
const courseCatalog = [
  {
    name: "Scratch",
    description: "Visual stories, games, and creative thinking",
    icon: Sparkles,
    color: "from-pink-500/20 to-rose-500/5",
  },
  {
    name: "Robotics",
    description: "Build, control, and explore smart machines",
    icon: Target,
    color: "from-orange-500/20 to-amber-500/5",
  },
  {
    name: "Web",
    description: "Create your first websites and digital ideas",
    icon: Code2,
    color: "from-cyan-500/20 to-blue-500/5",
  },
  {
    name: "Python",
    description: "A five-month journey from basics to problem solving",
    icon: BookOpen,
    color: "from-violet-500/20 to-indigo-500/5",
  },
] as const;

const text = {
  back: "Back to home",
  title: "Your learning space",
  sub: "Your course code unlocks your lessons \u2014 Python: id-123456789 \u00b7 Web: id-987654321 \u00b7 Scratch: id-147852369",
  placeholder: "id-123456789",
  unlock: "Unlock my course",
  invalid: "This code is invalid or inactive. Check the code and try again.",
  welcome: "Welcome",
  sessions: "sessions",
  months: "months",
  coreTrack: "Core Python track",
  problemTrack: "Problem Solving track",
  coreSub: "From print() to functions",
  problemSub: "Applied challenges for the final month",
  roadmap: "Five-month roadmap",
  curriculum: "Curriculum map",
  progress: "Your progress",
  phase: "Phase",
  lesson: "Session",
  read: "Lesson guide",
  topics: "Key ideas",
  example: "Try the example",
  run: "Run example",
  copied: "Code copied",
  mission: "Your mission",
  complete: "Mark session complete",
  completed: "session completed",
  quiz: "Check your understanding",
  submitQuiz: "Show my result",
  resetQuiz: "Reset quiz",
  correct: "Correct answer",
  tryAgain: "Read the guide and try again",
  signOut: "Sign out",
  noPython: "Python is not enrolled for this student yet.",
  tip: "Coach tip",
  show: "Show explanation",
  hide: "Hide explanation",
};

export default function StudentPortal() {
  const [code, setCode] = useState("id-123456789");
  const [submitted, setSubmitted] = useState(false);
  const [track, setTrack] = useState<Track>("core");
  const [activePhase, setActivePhase] = useState(1);
  const [activeLessonId, setActiveLessonId] = useState("s0");
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const progressLoadedFor = useRef<string | null>(null);
  const [openSections, setOpenSections] = useState<number[]>([0, 1, 2]);
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    caption: string;
  } | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const query = trpc.portal.byCode.useQuery(
    { accessCode: code || "IDA-DEMO" },
    { enabled: false, refetchInterval: LIVE_REFETCH_INTERVAL },
  );
  const student = query.data;
  const enrolledCourses = useMemo(() => student?.courses ?? [], [student]);
  const enrolledCount = enrolledCourses.length;
  // Single course â†’ open directly. Multiple courses â†’ chooser until one is picked.
  const autoCourse = enrolledCount === 1 ? (enrolledCourses[0] ?? null) : null;
  const effectiveCourse = selectedCourse ?? autoCourse;
  const showChooser = Boolean(student) && enrolledCount > 1 && !selectedCourse;
  const isScratch = effectiveCourse === "Scratch";
  const courseName = effectiveCourse ?? "Python";
  const curriculumLessons = isScratch ? allScratchLessons : allPythonLessons;
  const curriculumCoreLessons = isScratch
    ? allScratchLessons.filter(lesson => lesson.kind === "core")
    : coreLessons;
  const curriculumProblemLessons = isScratch
    ? allScratchLessons.filter(lesson => lesson.kind === "problem")
    : problemSolvingLessons;
  useEffect(() => {
    if (!student) return;
    const courseKey = `idev-progress-${student.accessCode}-${courseName}`;
    const loadKey = `${student.accessCode}-${courseName}`;
    if (progressLoadedFor.current !== loadKey) {
      progressLoadedFor.current = loadKey;
      try {
        const raw = localStorage.getItem(courseKey);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          setCompletedLessons(
            Array.isArray(parsed)
              ? parsed.filter((x): x is string => typeof x === "string")
              : []
          );
        } else {
          // migration Ù…Ù† Ø§Ù„Ù…ÙØªØ§Ø­ Ø§Ù„Ù‚Ø¯ÙŠÙ… Ø§Ù„Ù…Ø´ØªØ±Ùƒ (ÙƒØ§Ù† Ø¨ÙŠØ®Ù„Ø· Python Ùˆ Scratch Ù…Ø¹ Ø¨Ø¹Ø¶)
          const legacyKey = `idev-progress-${student.accessCode}`;
          const legacyRaw = localStorage.getItem(legacyKey);
          if (legacyRaw) {
            const parsed: unknown = JSON.parse(legacyRaw);
            const list = Array.isArray(parsed)
              ? parsed.filter((x): x is string => typeof x === "string")
              : [];
            // ÙÙ„ØªØ±Ø© Ø¹Ù„Ù‰ Ø¯Ø±ÙˆØ³ Ø§Ù„ÙƒÙˆØ±Ø³ Ø§Ù„Ø­Ø§Ù„ÙŠ ÙÙ‚Ø·
            const validIds = new Set(
              curriculumLessons.map(lesson => lesson.id)
            );
            setCompletedLessons(list.filter(id => validIds.has(id)));
          } else {
            setCompletedLessons([]);
          }
        }
      } catch {
        setCompletedLessons([]);
      }
      return;
    }
    try {
      localStorage.setItem(courseKey, JSON.stringify(completedLessons));
    } catch {
      /* storage unavailable */
    }
  }, [student, completedLessons, courseName]);
  const journey = showChooser
    ? "Choose your course"
    : `My ${courseName} journey`;
  const phases = isScratch ? scratchPhases : curriculumPhases;
  const visibleLessons = useMemo(
    () =>
      curriculumLessons.filter(
        lesson => lesson.kind === track && lesson.phase === activePhase
      ),
    [activePhase, track, curriculumLessons]
  );
  const selectedLesson: CurriculumLesson =
    curriculumLessons.find(lesson => lesson.id === activeLessonId) ||
    curriculumCoreLessons[0] ||
    curriculumLessons[0];
  const validCompletedLessons = useMemo(() => {
    const validIds = new Set(curriculumLessons.map(lesson => lesson.id));
    return completedLessons.filter(id => validIds.has(id));
  }, [completedLessons, curriculumLessons]);
  const completionPercent =
    curriculumLessons.length === 0
      ? 0
      : Math.round(
          (validCompletedLessons.length / curriculumLessons.length) * 100
        );
  const certificateCourse = useMemo(
    () => getCertificateCourse(effectiveCourse),
    [effectiveCourse]
  );
  const certificate = useCourseCertificate({
    studentName: student?.name,
    accessCode: student?.accessCode,
    isComplete: completionPercent === 100,
    course: certificateCourse,
  });
  const quizScore = selectedLesson.quiz.reduce(
    (score, item, index) =>
      score + (quizAnswers[index] === item.answer ? 1 : 0),
    0
  );
  // Ø£ÙˆÙ„ Ù…Ø§ Ø§Ù„ÙƒÙˆØ±Ø³ ÙŠØªÙØªØ­ (Ø£Ùˆ ÙŠØªØ¨Ø¯Ù„)ØŒ Ø§ÙØªØ­ Ø¹Ù„Ù‰ Ø£ÙˆÙ„ Ø¯Ø±Ø³ ÙÙŠÙ‡ Ø¹Ù„Ù‰ Ø·ÙˆÙ„
  useEffect(() => {
    const first = curriculumCoreLessons[0] || curriculumLessons[0];
    if (first) {
      setActiveLessonId(first.id);
      setActivePhase(first.phase);
      setTrack(first.kind);
      setOpenSections([0, 1, 2]);
      setQuizAnswers({});
      setQuizSubmitted(false);
    }
  }, [courseName]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSelectedCourse(null);
    setSubmitted(true);
    await query.refetch();
  };
  const chooseTrack = (nextTrack: Track) => {
    const pool = isScratch ? allScratchLessons : allPythonLessons;
    const corePool = pool.filter(lesson => lesson.kind === "core");
    const problemPool = pool.filter(lesson => lesson.kind === "problem");
    const targetPool = nextTrack === "core" ? corePool : problemPool;
    if (targetPool.length === 0) return;
    const firstPhase = Math.min(...targetPool.map(lesson => lesson.phase));
    const firstLesson =
      targetPool.find(lesson => lesson.phase === firstPhase) || targetPool[0];
    setTrack(nextTrack);
    setActivePhase(firstPhase);
    setActiveLessonId(firstLesson.id);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };
  const choosePhase = (phaseId: number) => {
    const pool = isScratch ? allScratchLessons : allPythonLessons;
    const nextTrack: Track = !isScratch && phaseId >= 4 ? "problem" : "core";
    const first =
      pool.find(
        lesson => lesson.phase === phaseId && lesson.kind === nextTrack
      ) || pool.find(lesson => lesson.phase === phaseId);
    setTrack(first ? first.kind : nextTrack);
    setActivePhase(phaseId);
    if (first) setActiveLessonId(first.id);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };
  const chooseLesson = (lesson: CurriculumLesson) => {
    setActiveLessonId(lesson.id);
    setOpenSections([0, 1, 2]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    window.setTimeout(
      () =>
        document
          .getElementById("lesson-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      20
    );
  };
  const copyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    toast.success(text.copied);
  };
  const runExample = () =>
    toast.success("Example ready to try in your Python editor");
  const toggleComplete = () => {
    const isDone = completedLessons.includes(selectedLesson.id);
    setCompletedLessons(current =>
      isDone
        ? current.filter(id => id !== selectedLesson.id)
        : [...current, selectedLesson.id]
    );
    toast.success(
      isDone ? "Session marked active" : "Great job! Session completed"
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-primary/20">
            <img
              src="https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/logo.png"
              alt="iDeveloper"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="font-bold">iDeveloper</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {text.back}
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {!student ? (
        <main className="mx-auto flex min-h-[calc(100vh-90px)] max-w-7xl items-center px-5 pb-16 lg:px-8">
          <div className="w-full">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="rounded-full px-3 py-1">iDeveloper</Badge>
              <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
                Choose your course and start your journey
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Use the shared code to unlock every course and the complete
                curriculum.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {courseCatalog.map(course => {
                const Icon = course.icon;
                return (
                  <div
                    key={course.name}
                    className={`group rounded-[1.75rem] border border-border bg-gradient-to-br ${course.color} p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-xl font-bold">{course.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {course.description}
                    </p>
                    <div className="mt-6 text-xs font-semibold text-muted-foreground">
                      Details unlock with your code
                    </div>
                  </div>
                );
              })}
            </div>
            <Card className="mx-auto mt-8 max-w-xl rounded-[2rem] border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-2xl font-bold">Student access</h2>
                <p className="mt-2 text-sm text-muted-foreground">{text.sub}</p>
                <form onSubmit={submit} className="mt-5 space-y-3">
                  <Input
                    value={code}
                    onChange={event =>
                      setCode(event.target.value.toUpperCase())
                    }
                    placeholder={text.placeholder}
                    className="h-13 rounded-2xl bg-background px-5 text-center font-mono tracking-widest"
                  />
                  <Button
                    className="h-13 w-full rounded-2xl text-base"
                    disabled={!code || query.isFetching}
                  >
                    {query.isFetching ? "..." : text.unlock}
                    <ArrowRight className="ms-2 h-5 w-5" />
                  </Button>
                </form>
                {submitted && !student && !query.isFetching && (
                  <p className="mt-4 text-sm text-destructive">
                    {text.invalid}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-7xl px-5 pb-20 pt-8 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-semibold text-primary">
                {text.welcome}, {student.name}
              </div>
              <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">
                {journey}
              </h1>
              <p className="mt-3 text-muted-foreground">
                iDeveloper Â· {student.accessCode}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setSubmitted(false);
                setCode("");
                setSelectedCourse(null);
                window.location.assign("/student");
              }}
            >
              {text.signOut}
            </Button>
          </div>
          {enrolledCount > 1 && selectedCourse && (
            <div className="mb-6 flex flex-wrap gap-2">
              {enrolledCourses.map(course => (
                <Button
                  key={course}
                  variant={selectedCourse === course ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSelectedCourse(course)}
                >
                  {course}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => setSelectedCourse(null)}
              >
                All courses
              </Button>
            </div>
          )}
          {showChooser && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseCatalog
                .filter(course =>
                  enrolledCourses.includes(course.name as never)
                )
                .map(course => {
                  const Icon = course.icon;
                  return (
                    <button
                      key={course.name}
                      type="button"
                      onClick={() => setSelectedCourse(course.name)}
                      className={`group rounded-[1.75rem] border border-border bg-gradient-to-br ${course.color} p-6 text-start transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h2 className="mt-6 text-xl font-bold">{course.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {course.description}
                      </p>
                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        Open course
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
          {(student.courses?.includes("Python") ||
            student.courses?.includes("Scratch")) &&
          (effectiveCourse === "Python" || effectiveCourse === "Scratch") ? (
            <>
              <div id="python-course" className="scroll-mt-6">
                <div className="grid gap-4">
                  <Card className="overflow-hidden rounded-[2rem] border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
                    <CardContent className="p-6 md:p-8">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge className="rounded-full">
                            {courseName} Â· {isScratch ? 3 : 5} {text.months}
                          </Badge>
                          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                            {text.curriculum}
                          </h2>
                          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                            {isScratch
                              ? "A three-month game journey from first setup to final challenge."
                              : "A five-month journey from foundations to applied problem solving."}
                          </p>
                        </div>
                        {isScratch ? (
                          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-border sm:block">
                            <img
                              src={SCRATCH_LOGO}
                              alt="Scratch"
                              className="h-16 w-16 object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="hidden rounded-2xl bg-primary/10 p-4 text-primary sm:block">
                            <Trophy className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <div className="mt-7 flex items-center justify-between text-sm sm:text-base">
                        <span>{text.progress}</span>
                        <b>{completionPercent}%</b>
                      </div>
                      <Progress
                        value={completionPercent}
                        className="mt-2 h-3"
                      />
                      {certificateCourse ? (
                        <CertificateClaim
                          courseName={certificateCourse.courseName}
                          sessionCount={certificateCourse.sessionCount}
                          monthCount={certificateCourse.monthCount}
                          complete={certificate.canClaim}
                          busy={certificate.busy}
                          issued={certificate.issued}
                          onDownload={certificate.download}
                        />
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-8 grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
                  <aside className="space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                          <Map className="h-4 w-4 text-primary" />
                          {isScratch ? "Three-month roadmap" : text.roadmap}
                        </div>
                        <span className="text-xs text-muted-foreground sm:text-sm">
                          {phases.length} phases
                        </span>
                      </div>
                      <div className="space-y-2">
                        {phases.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => choosePhase(item.id)}
                            className={`w-full rounded-xl border p-3 text-start transition ${activePhase === item.id ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/40"}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground sm:text-sm">{`Month ${item.month}`}</span>
                              <span
                                className={`h-2 w-2 rounded-full bg-gradient-to-r ${item.color}`}
                              />
                            </div>
                            <div className="mt-1 text-sm font-bold sm:text-base">{item.en}</div>
                            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                              {item.meta}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="mb-3 text-sm font-semibold sm:text-base">
                        {text.phase} {activePhase}
                      </div>
                      <div className="space-y-2">
                        {visibleLessons.map(lesson => (
                          <button
                            key={lesson.id}
                            type="button"
                            aria-current={
                              selectedLesson.id === lesson.id
                                ? "page"
                                : undefined
                            }
                            onClick={() => chooseLesson(lesson)}
                            className={`w-full rounded-xl border p-3 text-start transition ${selectedLesson.id === lesson.id ? "border-primary bg-primary/10 shadow-sm" : "border-border/70 hover:border-primary/40"}`}
                          >
                            <div className="flex items-center gap-3">
                              {isScratch ? (
                                <MarkMini>
                                  <Sparkles className="h-5 w-5" />
                                </MarkMini>
                              ) : (
                                <LessonMini logo={PYTHON_LOGO} alt="Python" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs text-primary sm:text-sm">
                                    {String(lesson.number).padStart(2, "0")}
                                  </span>
                                  <CheckCircle2
                                    className={`h-4 w-4 shrink-0 ${completedLessons.includes(lesson.id) ? "text-emerald-500" : "text-muted-foreground"}`}
                                  />
                                </div>
                                <div className="mt-1 truncate text-sm font-bold sm:text-base">
                                  {lesson.title}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                              {lesson.subtitle}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                  <section id="lesson-detail" className="scroll-mt-6">
                    <Card
                      className={`overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br ${selectedLesson.accent}`}
                    >
                      <CardContent className="p-0">
                        <div className="border-b border-white/10 bg-card/70 p-7 backdrop-blur md:p-9">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-full">
                              {selectedLesson.kind === "problem"
                                ? "Problem Solving"
                                : isScratch
                                  ? "Scratch"
                                  : "Python Core"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="rounded-full"
                            >{`Month ${selectedLesson.month}`}</Badge>
                            <Badge variant="outline" className="rounded-full">
                              {text.lesson} {selectedLesson.number} /{" "}
                              {curriculumLessons.length}
                            </Badge>
                          </div>
                          <h2 className="mt-5 text-2xl font-bold sm:text-3xl md:text-5xl">
                            {selectedLesson.title}
                          </h2>
                          <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                            {selectedLesson.subtitle}
                          </p>
                          <LessonArt
                            lesson={selectedLesson}
                            total={curriculumLessons.length}
                            phaseNames={isScratch ? {} : PYTHON_PHASES}
                            logo={isScratch ? SCRATCH_LOGO : PYTHON_LOGO}
                            mark={
                              !isScratch ? (
                                <BookOpen className="h-28 w-28" />
                              ) : undefined
                            }
                            alt={isScratch ? "Scratch" : "Python"}
                          />
                        </div>
                        <div className="space-y-4 p-7 md:p-9">
                          {selectedLesson.sections.map((section, index) => {
                            const isOpen = openSections.includes(index);
                            return (
                              <div
                                key={section.title}
                                className="overflow-hidden rounded-2xl border border-border/70 bg-card/70"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenSections(current =>
                                      isOpen
                                        ? current.filter(item => item !== index)
                                        : [...current, index]
                                    )
                                  }
                                  className="flex w-full items-center justify-between gap-4 p-5 text-start"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-mono text-sm text-primary">
                                      {index + 1}
                                    </span>
                                    <span className="text-lg font-bold">
                                      {section.title}
                                    </span>
                                  </div>
                                  {isOpen ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </button>
                                {isOpen && (
                                  <div className="border-t border-border/70 p-5 pt-4">
                                    <div className="max-w-3xl space-y-2">
                                      {(section.body ?? "")
                                        .split("\n")
                                        .map((line, li) => {
                                          const trimmed = line.trim();
                                          if (!trimmed) return null;
                                          if (
                                            trimmed.startsWith("â€¢") ||
                                            trimmed.startsWith("-")
                                          )
                                            return (
                                              <div
                                                key={li}
                                                className="flex gap-2.5 leading-7 text-muted-foreground"
                                              >
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                  â€¢
                                                </span>
                                                <span>
                                                  {trimmed.replace(
                                                    /^[â€¢-]\s*/,
                                                    ""
                                                  )}
                                                </span>
                                              </div>
                                            );
                                          if (/^\d+\./.test(trimmed)) {
                                            const dot = trimmed.indexOf(".");
                                            return (
                                              <div
                                                key={li}
                                                className="flex gap-2.5 leading-7 text-muted-foreground"
                                              >
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">
                                                  {trimmed.slice(0, dot)}
                                                </span>
                                                <span>
                                                  {trimmed
                                                    .slice(dot + 1)
                                                    .trim()}
                                                </span>
                                              </div>
                                            );
                                          }
                                          return (
                                            <p
                                              key={li}
                                              className="leading-8 text-muted-foreground"
                                            >
                                              {trimmed}
                                            </p>
                                          );
                                        })}
                                    </div>
                                    {section.images &&
                                      section.images.length > 0 && (
                                        <div
                                          className={`mt-5 grid gap-4 ${section.images.length > 1 ? "sm:grid-cols-2" : "max-w-3xl"}`}
                                        >
                                          {section.images.map(src => (
                                            <CurriculumFigure
                                              key={src}
                                              src={src}
                                              alt={section.title}
                                              onZoom={(s, c) =>
                                                setZoomedImage({
                                                  src: s,
                                                  caption: c,
                                                })
                                              }
                                            />
                                          ))}
                                        </div>
                                      )}
                                    {section.videos &&
                                      section.videos.length > 0 && (
                                        <div className="mt-5 grid gap-4 max-w-3xl">
                                          {section.videos.map(src => (
                                            <video
                                              key={src}
                                              src={src}
                                              controls
                                              preload="metadata"
                                              playsInline
                                              className="w-full rounded-2xl border border-border/70 bg-black"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    {section.starterCode ||
                                    section.solutionCode ? (
                                      <div className="mt-5 space-y-4">
                                        <div>
                                          <div className="mb-2 text-sm font-bold">
                                            {isScratch
                                              ? "Try yourself"
                                              : "Try yourself â€” empty interpreter"}
                                          </div>
                                          {isScratch ? (
                                            <ScratchBlocks
                                              code={
                                                section.starterCode ??
                                                "# Write your code here\n"
                                              }
                                              label="Try yourself"
                                              copyLabel={text.copied}
                                            />
                                          ) : (
                                            <PythonRunner
                                              code={
                                                section.starterCode ??
                                                "# Write your code here\n"
                                              }
                                              exampleLabel="Try yourself â€” empty interpreter"
                                              runLabel={text.run}
                                              copyLabel={text.copied}
                                            />
                                          )}
                                        </div>
                                        {section.solutionCode && (
                                          <div>
                                            <div className="mb-2 text-sm font-bold">
                                              Solution â€” compare your answer
                                            </div>
                                            {isScratch ? (
                                              <ScratchBlocks
                                                code={section.solutionCode}
                                                label="Solution â€” compare your answer"
                                                copyLabel={text.copied}
                                              />
                                            ) : (
                                              <PythonRunner
                                                code={section.solutionCode}
                                                exampleLabel="Solution â€” compare your answer"
                                                runLabel={text.run}
                                                copyLabel={text.copied}
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      section.code && (
                                        <div className="mt-5">
                                          {isScratch ? (
                                            <ScratchBlocks
                                              code={section.code}
                                              label={text.example}
                                              copyLabel={text.copied}
                                            />
                                          ) : (
                                            <PythonRunner
                                              code={section.code}
                                              exampleLabel={text.example}
                                              runLabel={text.run}
                                              copyLabel={text.copied}
                                            />
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/80">
                            <div className="flex items-start gap-3 p-5">
                              <Zap className="mt-1 h-5 w-5 shrink-0 text-primary" />
                              <div className="flex-1">
                                <div className="font-bold">Homework</div>
                                <div className="mt-2 max-w-3xl space-y-2">
                                  {(selectedLesson.challenge ?? "")
                                    .split("\n")
                                    .map((line, li) => {
                                      const trimmed = line.trim();
                                      if (!trimmed) return null;
                                      if (
                                        trimmed.startsWith("â€¢") ||
                                        trimmed.startsWith("-")
                                      )
                                        return (
                                          <div
                                            key={li}
                                            className="flex gap-2.5 leading-7 text-muted-foreground"
                                          >
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                              â€¢
                                            </span>
                                            <span>
                                              {trimmed.replace(
                                                /^[â€¢-]\s*/,
                                                ""
                                              )}
                                            </span>
                                          </div>
                                        );
                                      const num =
                                        trimmed.match(/^(\d+)[.)]\s*(.*)$/);
                                      if (num)
                                        return (
                                          <div
                                            key={li}
                                            className="flex gap-2.5 leading-7 text-muted-foreground"
                                          >
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">
                                              {num[1]}
                                            </span>
                                            <span>{num[2]}</span>
                                          </div>
                                        );
                                      return (
                                        <p
                                          key={li}
                                          className="leading-8 text-muted-foreground"
                                        >
                                          {trimmed}
                                        </p>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>
                            {!isScratch && (
                              <div className="border-t border-border/70 p-5 pt-4">
                                <PythonRunner
                                  key={selectedLesson.id}
                                  code={"# Write your homework solution here\n"}
                                  exampleLabel="Your code â€” write it and press Run"
                                  runLabel="Run"
                                  copyLabel={text.copied}
                                />
                              </div>
                            )}
                          </div>
                          <div className="rounded-2xl border border-border bg-card/80 p-5">
                            <div className="mb-5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 font-bold">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                {text.quiz}
                                <span className="text-sm font-semibold text-muted-foreground">
                                  {selectedLesson.quiz.length} questions
                                </span>
                              </div>
                              {quizSubmitted && (
                                <Badge
                                  variant={
                                    quizScore === selectedLesson.quiz.length
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {quizScore}/{selectedLesson.quiz.length}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-5">
                              {selectedLesson.quiz.map((item, index) => (
                                <div key={item.question}>
                                  <div className="font-semibold">
                                    {index + 1}. {item.question}
                                  </div>
                                  {item.questionImages &&
                                    item.questionImages.length > 0 && (
                                      <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
                                        {item.questionImages.map(src => (
                                          <button
                                            key={src}
                                            type="button"
                                            onClick={() =>
                                              setZoomedImage({
                                                src,
                                                caption: item.question,
                                              })
                                            }
                                            className="overflow-hidden rounded-xl border border-border/70 bg-white transition hover:border-primary/50"
                                          >
                                            <img
                                              src={src}
                                              alt={item.question}
                                              loading="lazy"
                                              className="max-h-40 w-full object-contain p-1"
                                            />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {item.options.map((option, optionIndex) => (
                                      <button
                                        type="button"
                                        key={option}
                                        onClick={() => {
                                          setQuizAnswers(current => ({
                                            ...current,
                                            [index]: optionIndex,
                                          }));
                                          setQuizSubmitted(false);
                                        }}
                                        className={`rounded-xl border p-3 text-start text-sm transition ${quizAnswers[index] === optionIndex ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/40"}`}
                                      >
                                        {item.optionImages?.[optionIndex] &&
                                        item.optionImages[optionIndex]!.length >
                                          0 ? (
                                          <span className="block space-y-2">
                                            {item.optionImages[
                                              optionIndex
                                            ]!.map(src => (
                                              <img
                                                key={src}
                                                src={src}
                                                alt={option}
                                                loading="lazy"
                                                className="mx-auto max-h-32 w-full rounded-lg bg-white object-contain p-1"
                                              />
                                            ))}
                                            <span className="block text-xs leading-5 text-muted-foreground">
                                              {option}
                                            </span>
                                          </span>
                                        ) : /^https?:\/\/\S+\.(png|jpe?g|webp|gif|svg)(\?\S*)?$/i.test(
                                            option
                                          ) ? (
                                          <img
                                            src={option}
                                            alt={`Answer option ${optionIndex + 1}`}
                                            loading="lazy"
                                            className="mx-auto max-h-44 w-full rounded-lg bg-white object-contain"
                                          />
                                        ) : (
                                          option
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                  {quizSubmitted && (
                                    <div
                                      className={`mt-3 rounded-xl p-3 text-sm leading-6 ${quizAnswers[index] === item.answer ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-700"}`}
                                    >
                                      {quizAnswers[index] === item.answer
                                        ? text.correct
                                        : text.tryAgain}{" "}
                                      Â· {item.explanation}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                onClick={() => {
                                  const total = selectedLesson.quiz.length;
                                  const perfect =
                                    total > 0 && quizScore === total;
                                  const solved = quizScore > 0;
                                  setQuizSubmitted(true);
                                  if (
                                    solved &&
                                    !completedLessons.includes(
                                      selectedLesson.id
                                    )
                                  ) {
                                    setCompletedLessons(current => [
                                      ...current,
                                      selectedLesson.id,
                                    ]);
                                    toast.success(
                                      perfect
                                        ? `Perfect ${total}/${total}! Session completed â€” progress up!`
                                        : `Nice work ${quizScore}/${total}! Session completed â€” progress up!`
                                    );
                                  } else {
                                    toast.success(
                                      `Your score: ${quizScore}/${total}`
                                    );
                                  }
                                }}
                              >
                                {text.submitQuiz}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setQuizAnswers({});
                                  setQuizSubmitted(false);
                                }}
                              >
                                <RotateCcw className="me-2 h-4 w-4" />
                                {text.resetQuiz}
                              </Button>
                            </div>
                          </div>
                          <Button
                            type="button"
                            className="h-14 w-full rounded-2xl text-base"
                            variant={
                              completedLessons.includes(selectedLesson.id)
                                ? "outline"
                                : "default"
                            }
                            onClick={toggleComplete}
                          >
                            <CheckCircle2 className="me-2 h-5 w-5" />
                            {completedLessons.includes(selectedLesson.id)
                              ? text.completed
                              : text.complete}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                </div>
              </div>
            </>
          ) : null}
          {effectiveCourse === "Robotics" && (
            <Card className="rounded-[2rem]">
              <CardContent className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-2xl font-bold">
                  Robotics â€” coming soon
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  This student is enrolled in Robotics. Lessons will appear here
                  once the track is published.
                </p>
              </CardContent>
            </Card>
          )}
          {student.courses?.includes("Web") && effectiveCourse === "Web" && (
            <div id="web-course" className="scroll-mt-6">
              <WebCourse
                studentName={student?.name}
                accessCode={student?.accessCode}
              />
            </div>
          )}
        </main>
      )}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-bold text-white transition hover:bg-white/20"
            onClick={() => setZoomedImage(null)}
          >
            <X className="h-4 w-4" />
            Close - Ø§Ù‚ÙÙ„
          </button>
          <figure
            className="max-h-[90vh] max-w-[95vw]"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={zoomedImage.src}
              alt={zoomedImage.caption}
              className="max-h-[78vh] max-w-[95vw] rounded-2xl border border-white/20 bg-white object-contain shadow-2xl"
            />
            <figcaption className="mx-auto mt-3 w-fit max-w-full truncate rounded-full bg-white/10 px-4 py-1.5 text-sm text-white">
              {zoomedImage.caption}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
