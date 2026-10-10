import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Map,
  RotateCcw,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import CertificateClaim from "@/components/CertificateClaim";
import CurriculumFigure from "@/components/CurriculumFigure";
import HomeworkBoard from "@/components/HomeworkBoard";
import LessonArt, { MarkMini } from "@/components/LessonArt";
import WebCodeRunner, { runsByItself } from "@/components/WebCodeRunner";
import { useCourseCertificate } from "@/hooks/useCourseCertificate";
import { CERTIFICATE_COURSES } from "@/lib/certificateCourses";
import {
  allWebLessons,
  curriculumPhases,
  TRACK_LABEL,
  WEB_MONTHS,
  type WebLesson,
} from "@/data/webCurriculum";

const text = {
  curriculum: "Curriculum map",
  sub: "A six-month journey from your first tag to interactive web pages",
  roadmap: "Six-month roadmap",
  phase: "Phase",
  lesson: "Session",
  example: "Try the example",
  run: "Run example",
  copied: "Code copied",
  activityBlank:
    "The picture for this activity has not been added yet. Build it in the editor below — it starts empty.",
  activityEditor: "Your code — the editor is empty",
  yourCode: "Your code — write it and press Run",
  quiz: "Check your understanding",
  readSource: "Read:",
  submitQuiz: "Show my result",
  resetQuiz: "Reset quiz",
  correct: "Correct answer",
  tryAgain: "Read the guide and try again",
  complete: "Mark session complete",
  completed: "session completed",
  progress: "Your progress",
  empty: "Web Development — sessions coming soon",
  emptyBody:
    "This student is enrolled in Web Development. The HTML, CSS and JavaScript sessions will appear here once the track is published.",
};

/** Track badge label, resolved the way the Python page labels core / problem. */
const trackOf = (lesson: WebLesson) => TRACK_LABEL[lesson.kind] ?? lesson.kind;

/**
 * The file a blank board in the CSS track opens on.
 *
 * A CSS session styles a page that already exists, so handing the student an
 * empty editor hands them nothing at all: there is no tag for a rule to attach
 * to, and pressing Run on an empty box only says that there is nothing there
 * yet. So every blank board in this track opens on the bakery's markup with an
 * empty `<style>` inside it — the ids and classes the student already wrote in
 * the HTML course, waiting for the rules that were missing. No CSS is given: the
 * selector is still theirs to choose, and that is the whole exercise.
 *
 * The HTML track does not use this. There the markup is the work, so its boards
 * stay genuinely empty.
 */
const CSS_BOARD_STARTER = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Family Bakery</title>
    <style>
      /* Your CSS goes between these two tags.
         Everything below the head is the page you built in the HTML
         course — pick a selector and write one rule. */
    </style>
  </head>
  <body>

    <header class="header">
      <h1>Family Bakery</h1>
      <nav>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="index.html">About us</a></li>
          <li><a href="index.html">Products</a></li>
          <li><a href="index.html">Order</a></li>
        </ul>
      </nav>
    </header>

    <section class="hero">
      <p class="main-part">Welcome to</p>
      <h2>Family Bakery</h2>
      <p>Fresh bread and cakes, baked every morning on 12 Nile Street.</p>
      <div class="buttons">
        <a class="btn" href="index.html">See what we bake</a>
        <a class="btn outline" href="index.html">Order a box</a>
      </div>
    </section>

    <section id="about">
      <h2>Our story</h2>
      <p class="info">We opened in 2019, in a shop that used to sell car parts.</p>
    </section>

    <section id="baking">
      <h2>What we bake</h2>
      <ul class="baking">
        <li>Baladi</li>
        <li>Wholemeal</li>
        <li>Sourdough</li>
      </ul>
    </section>

    <section id="location">
      <h2>Come and find us</h2>
      <p class="detail">12 Nile Street. Open every day except Friday.</p>
    </section>

    <section id="information">
      <h2>Opening hours</h2>
      <p class="info">Saturday to Thursday, 8:00 until 21:00.</p>
      <p class="info"><span class="circle">i</span> We opened in 2019.</p>
    </section>

    <footer>
      <p class="info">12 Nile Street. Open every day except Friday.</p>
    </footer>

  </body>
</html>`;

/**
 * What a blank board opens on.
 *
 * Sessions two to eight of the CSS track get the bakery markup with an empty
 * `<style>`, because by then the page exists and only the rules are missing.
 * Session one is left exactly as it was: there the student is still meeting
 * CSS for the first time and the empty box is the lesson.
 */
const boardStarter = (lesson: WebLesson, own?: string) => {
  if (own) return own;
  return lesson.kind === "CSS" && lesson.id !== "css-1" ? CSS_BOARD_STARTER : "";
};

const PHASE_NAMES: Record<number, string> = Object.fromEntries(
  curriculumPhases.map(phase => [phase.id, phase.en])
);

/** Renders a body or homework block, turning `-` / `•` / `1.` lines into rows. */
function RichText({ value }: { value: string }) {
  return (
    <div className="max-w-3xl space-y-2">
      {value.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
          return (
            <div
              key={index}
              className="flex gap-2.5 leading-7 text-muted-foreground"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                •
              </span>
              <span>{trimmed.replace(/^[•-]\s*/, "")}</span>
            </div>
          );
        }
        const numbered = trimmed.match(/^(\d+)[.)]\s*(.*)$/);
        if (numbered) {
          return (
            <div
              key={index}
              className="flex gap-2.5 leading-7 text-muted-foreground"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">
                {numbered[1]}
              </span>
              <span>{numbered[2]}</span>
            </div>
          );
        }
        return (
          <p key={index} className="leading-8 text-muted-foreground">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

type WebCourseProps = {
  studentName?: string | null;
  accessCode?: string | null;
};

export default function WebCourse({ studentName, accessCode }: WebCourseProps) {
  const [activePhase, setActivePhase] = useState(curriculumPhases[0]?.id ?? 1);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<number[]>([0, 1, 2]);
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    caption: string;
  } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  // One ref per section, so a quiz question can open the section that answers it
  // and put it in front of the student rather than leaving them to hunt.
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressLoadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!accessCode) return;
    const courseKey = `idev-progress-${accessCode}-Web`;
    if (progressLoadedFor.current !== accessCode) {
      progressLoadedFor.current = accessCode;
      try {
        const raw = localStorage.getItem(courseKey);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        const ids = new Set(allWebLessons.map(lesson => lesson.id));
        setCompletedLessons(
          Array.isArray(parsed)
            ? parsed.filter(
                (item): item is string =>
                  typeof item === "string" && ids.has(item)
              )
            : []
        );
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
  }, [accessCode, completedLessons]);

  const visibleLessons = useMemo(
    () => allWebLessons.filter(lesson => lesson.phase === activePhase),
    [activePhase]
  );
  const selectedLesson =
    allWebLessons.find(lesson => lesson.id === activeLessonId) ??
    visibleLessons[0] ??
    allWebLessons[0];

  // Open the first session the moment the course becomes available.
  useEffect(() => {
    const first = allWebLessons[0];
    if (!first) return;
    setActiveLessonId(first.id);
    setActivePhase(first.phase);
    setOpenSections([0, 1, 2]);
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, []);

  const validCompletedLessons = useMemo(() => {
    const ids = new Set(allWebLessons.map(lesson => lesson.id));
    return completedLessons.filter(id => ids.has(id));
  }, [completedLessons]);
  const completionPercent =
    allWebLessons.length === 0
      ? 0
      : Math.round((validCompletedLessons.length / allWebLessons.length) * 100);

  const certificateCourse = CERTIFICATE_COURSES.Web;
  const certificate = useCourseCertificate({
    studentName,
    accessCode,
    isComplete: completionPercent === 100,
    course: certificateCourse,
  });

  const quizScore = selectedLesson
    ? selectedLesson.quiz.reduce(
        (score, item, index) =>
          score + (quizAnswers[index] === item.answer ? 1 : 0),
        0
      )
    : 0;

  /**
   * Opens the section a quiz question came from and scrolls it into view.
   *
   * The quiz sits at the bottom of a long page, so "read the guide and try
   * again" is only useful if the guide is one click away and lands in front of
   * the student. A section that is already open is still scrolled to, because
   * the point is the paragraph, not the accordion.
   */
  const goToSection = (title: string) => {
    const index = selectedLesson.sections.findIndex(
      section => section.title === title
    );
    if (index < 0) return;
    setOpenSections(current =>
      current.includes(index) ? current : [...current, index]
    );
    // Wait for the accordion to finish opening before scrolling to it.
    window.requestAnimationFrame(() => {
      sectionRefs.current[index]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const choosePhase = (phaseId: number) => {
    const first =
      allWebLessons.find(lesson => lesson.phase === phaseId) ??
      allWebLessons[0];
    setActivePhase(phaseId);
    if (first) setActiveLessonId(first.id);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const chooseLesson = (lesson: WebLesson) => {
    setActiveLessonId(lesson.id);
    setOpenSections([0, 1, 2]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    window.setTimeout(
      () =>
        document
          .getElementById("web-lesson-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      20
    );
  };

  const toggleComplete = () => {
    if (!selectedLesson) return;
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

  if (!selectedLesson) {
    return (
      <Card className="rounded-[2rem]">
        <CardContent className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Code2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">{text.empty}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {text.emptyBody}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card className="overflow-hidden rounded-[2rem] border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="rounded-full">{`Web · ${WEB_MONTHS} months`}</Badge>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{text.curriculum}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{text.sub}</p>
            </div>
            <div className="hidden rounded-2xl bg-primary/10 p-4 text-primary sm:block">
              <Trophy className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-7 flex items-center justify-between text-sm sm:text-base">
            <span>{text.progress}</span>
            <b>{completionPercent}%</b>
          </div>
          <Progress value={completionPercent} className="mt-2 h-3" />
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <Map className="h-4 w-4 text-primary" />
                {text.roadmap}
              </div>
              <span className="text-xs text-muted-foreground sm:text-sm">
                {curriculumPhases.length} phases
              </span>
            </div>
            <div className="space-y-2">
              {curriculumPhases.map(item => {
                const count = allWebLessons.filter(
                  lesson => lesson.phase === item.id
                ).length;
                return (
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
                      {count > 0
                        ? `${item.meta} · ${count} ${
                            count === 1 ? "session" : "sessions"
                          }`
                        : `${item.meta} · coming soon`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">
              {text.phase} {activePhase}
            </div>
            <div className="space-y-2">
              {visibleLessons.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">
                  No sessions in this phase yet.
                </p>
              ) : (
                visibleLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    type="button"
                    aria-current={
                      selectedLesson.id === lesson.id ? "page" : undefined
                    }
                    onClick={() => chooseLesson(lesson)}
                    className={`w-full rounded-xl border p-3 text-start transition ${selectedLesson.id === lesson.id ? "border-primary bg-primary/10 shadow-sm" : "border-border/70 hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <MarkMini>
                        <Code2 className="h-5 w-5" />
                      </MarkMini>
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
                ))
              )}
            </div>
          </div>
        </aside>

        <section id="web-lesson-detail" className="scroll-mt-6">
          <Card
            className={`overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br ${selectedLesson.accent}`}
          >
            <CardContent className="p-0">
              <div className="border-b border-white/10 bg-card/70 p-7 backdrop-blur md:p-9">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {trackOf(selectedLesson)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {`Month ${selectedLesson.month}`}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {text.lesson} {selectedLesson.number} /{" "}
                    {allWebLessons.length}
                  </Badge>
                </div>
                <h2 className="mt-5 text-3xl font-bold md:text-5xl">
                  {selectedLesson.title}
                </h2>
                <p className="mt-3 text-lg leading-8 text-muted-foreground">
                  {selectedLesson.subtitle}
                </p>
                <LessonArt
                  lesson={selectedLesson}
                  total={allWebLessons.length}
                  phaseNames={PHASE_NAMES}
                  mark={<Code2 className="h-28 w-28" />}
                  alt="Web"
                />
              </div>

              <div className="space-y-4 p-7 md:p-9">
                {selectedLesson.sections.map((section, index) => {
                  const isOpen = openSections.includes(index);
                  // An activity carries the one picture it is measured against,
                  // and that picture belongs on the board above the empty
                  // editor — not in the lesson gallery, where a student could
                  // scroll past the target and call the job done.
                  const activityImage = section.blank
                    ? (section.images?.[0] ?? undefined)
                    : undefined;
                  const gallery = activityImage
                    ? (section.images ?? []).slice(1)
                    : (section.images ?? []);
                  // The file a practice opens on. Held in one place because the
                  // editor and the run decision have to be about the same text.
                  const board = boardStarter(
                    selectedLesson,
                    section.starterCode
                  );
                  const starter =
                    section.starterCode ?? "<!-- Write your code here -->\n";
                  return (
                    <div
                      key={section.title}
                      ref={node => {
                        sectionRefs.current[index] = node;
                      }}
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
                          {section.body && <RichText value={section.body} />}

                          {gallery.length > 0 && (
                            <div
                              className={`mt-5 grid gap-4 ${gallery.length > 1 ? "sm:grid-cols-2" : "max-w-3xl"}`}
                            >
                              {gallery.map(src => (
                                <CurriculumFigure
                                  key={src}
                                  src={src}
                                  alt={section.title}
                                  onZoom={(s, c) =>
                                    setZoomedImage({ src: s, caption: c })
                                  }
                                />
                              ))}
                            </div>
                          )}

                          {section.videos && section.videos.length > 0 && (
                            <div className="mt-5 grid max-w-3xl gap-4">
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

                          {section.blank ? (
                            <div className="mt-5">
                              <HomeworkBoard
                                key={`${selectedLesson.id}-${index}-blank`}
                                image={activityImage}
                                onZoom={(s, c) =>
                                  setZoomedImage({ src: s, caption: c })
                                }
                                placeholder={text.activityBlank}
                                editorLabel={text.activityEditor}
                                runLabel={text.run}
                                copyLabel={text.copied}
                                starterCode={board}
                                autoRun={runsByItself(board)}
                              />
                            </div>
                          ) : section.starterCode || section.solutionCode ? (
                            <div className="mt-5 space-y-4">
                              <div>
                                <div className="mb-2 text-sm font-bold">
                                  Try yourself
                                </div>
                                <WebCodeRunner
                                  key={`${selectedLesson.id}-${index}-starter`}
                                  code={starter}
                                  exampleLabel="Try yourself — empty editor"
                                  runLabel={text.run}
                                  copyLabel={text.copied}
                                  autoRun={runsByItself(starter)}
                                />
                              </div>
                              {section.solutionCode && (
                                <div>
                                  <div className="mb-2 text-sm font-bold">
                                    Solution — compare your answer
                                  </div>
                                  <WebCodeRunner
                                    key={`${selectedLesson.id}-${index}-solution`}
                                    code={section.solutionCode}
                                    exampleLabel="Solution — compare your answer"
                                    runLabel={text.run}
                                    copyLabel={text.copied}
                                    autoRun={runsByItself(section.solutionCode)}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            section.code && (
                              <div className="mt-5">
                                <WebCodeRunner
                                  key={`${selectedLesson.id}-${index}-code`}
                                  code={section.code}
                                  exampleLabel={text.example}
                                  runLabel={text.run}
                                  copyLabel={text.copied}
                                  autoRun={runsByItself(section.code)}
                                />
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

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
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="font-semibold">
                            {index + 1}. {item.question}
                          </div>
                          {item.section && (
                            <button
                              type="button"
                              onClick={() => goToSection(item.section!)}
                              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/10"
                            >
                              <BookOpen className="h-3 w-3" />
                              {text.readSource}
                              <span className="font-normal opacity-80">
                                {item.section}
                              </span>
                            </button>
                          )}
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
                              item.optionImages[optionIndex]!.length > 0 ? (
                                <span className="block space-y-2">
                                  {item.optionImages[optionIndex]!.map(src => (
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
                            · {item.explanation}
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
                        const perfect = total > 0 && quizScore === total;
                        const solved = quizScore > 0;
                        setQuizSubmitted(true);
                        if (
                          solved &&
                          !completedLessons.includes(selectedLesson.id)
                        ) {
                          setCompletedLessons(current => [
                            ...current,
                            selectedLesson.id,
                          ]);
                          toast.success(
                            perfect
                              ? `Perfect ${total}/${total}! Session completed — progress up!`
                              : `Nice work ${quizScore}/${total}! Session completed — progress up!`
                          );
                        } else {
                          toast.success(`Your score: ${quizScore}/${total}`);
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
            Close
          </button>
          <figure
            className="max-h-[90vh] max-w-[95vw]"
            onClick={event => event.stopPropagation()}
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
