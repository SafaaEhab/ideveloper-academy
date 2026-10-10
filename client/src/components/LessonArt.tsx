import type { ReactNode } from "react";
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
 * One cover for every course: the course mark on a clean white card, the same
 * for each session and each month — no per-lesson identities, no extra colour.
 */
export const PYTHON_LOGO = "/curriculum/session1/hero-coding-robot.jpg";
export const SCRATCH_LOGO = "https://res.cloudinary.com/alhiemg0/image/upload/logoscratch.png";

const PYTHON_PHASES: Record<number, string> = {
  1: "Foundations",
  2: "Decisions",
  3: "Loops",
  4: "Problem Solving",
  5: "Lists & Functions",
};

function MiniTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-primary ring-1 ring-border">
      {children}
    </span>
  );
}

type ArtProps = {
  lesson: LessonArtLesson;
  total: number;
  phaseNames: Record<number, string>;
  /** Fallback art when a session has no `heroImage`. Omit for a plain mark. */
  logo?: string;
  mark?: ReactNode;
  alt?: string;
};

export default function LessonArt({
  lesson,
  total,
  phaseNames,
  logo,
  mark,
  alt,
}: ArtProps) {
  const ghost = String(lesson.number).padStart(2, "0");
  const art = lesson.heroImage ?? logo;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5">
        <Badge variant="secondary" className="rounded-full">
          Session {ghost} / {total}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          Month {lesson.month}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          {phaseNames[lesson.phase] ?? `Phase ${lesson.phase}`}
        </Badge>
      </div>
      <div className="flex h-[260px] items-center justify-center p-6 md:h-[340px]">
        {art ? (
          <img
            src={art}
            alt={alt ?? "Course"}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-primary/25">{mark}</div>
        )}
      </div>
    </div>
  );
}

/** Thumbnail for a session in the side list, showing the course logo. */
export function LessonMini({ logo, alt }: { logo: string; alt: string }) {
  return (
    <MiniTile>
      <img
        src={logo}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-contain p-1"
      />
    </MiniTile>
  );
}

/** Thumbnail for a course that has no logo file, showing a mark instead. */
export function MarkMini({ children }: { children: ReactNode }) {
  return <MiniTile>{children}</MiniTile>;
}

export { PYTHON_PHASES };
