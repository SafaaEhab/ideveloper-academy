import { Badge } from "@/components/ui/badge";

export type LessonArtLesson = {
  id: string;
  number: number;
  month: number;
  phase: number;
  kind: string;
  title: string;
  subtitle: string;
  heroImage?: string;
};

/**
 * One cover for the whole Python curriculum: the Python logo on a clean
 * white card. Same image for every session and every month — no per-lesson
 * identities, no extra colors.
 */
export const PYTHON_LOGO = "/curriculum/session1/hero-coding-robot.jpg";
export const SCRATCH_LOGO = "/curriculum/scratch/logoscratch.png";

function PhaseName({ phase }: { phase: number }) {
  const names: Record<number, string> = {
    1: "Foundations",
    2: "Decisions",
    3: "Loops",
    4: "Problem Solving",
    5: "Lists & Functions",
  };
  return <>{names[phase] ?? `Phase ${phase}`}</>;
}

export default function PythonLessonArt({ lesson, fallback, alt }: { lesson: LessonArtLesson; fallback?: string; alt?: string }) {
  const ghost = String(lesson.number).padStart(2, "0");
  const art = lesson.heroImage ?? fallback ?? PYTHON_LOGO;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5">
        <Badge variant="secondary" className="rounded-full">
          Session {ghost} / 19
        </Badge>
        <Badge variant="outline" className="rounded-full">
          Month {lesson.month}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          <PhaseName phase={lesson.phase} />
        </Badge>
      </div>
      <div className="flex h-[260px] items-center justify-center p-6 md:h-[340px]">
        <img
          src={art}
          alt={alt ?? "Python"}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}

export function PythonLessonMini() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
      <img src={PYTHON_LOGO} alt="Python" loading="lazy" className="h-full w-full object-contain p-1" />
    </span>
  );
}

export function ScratchLessonMini() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
      <img src={SCRATCH_LOGO} alt="Scratch" loading="lazy" className="h-full w-full object-contain p-1" />
    </span>
  );
}
