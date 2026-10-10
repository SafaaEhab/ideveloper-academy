/**
 * The harness: every course's content, mounted with the real components, on a
 * page that needs no login.
 *
 * The student portal cannot be walked by a script — it sits behind an OAuth
 * session — so the courses it renders are mounted here instead. Nothing is
 * re-implemented: the same `WebCourse`, the same `PythonRunner`, the same
 * curriculum data, so what a check finds here is what a student gets.
 *
 * Vite's build has a single entry, so this file and `harness.html` never reach a
 * production bundle. It exists to be served in development and driven by
 * `scripts/verify-site.ts`.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import WebCourse from "@/components/WebCourse";
import PythonRunner from "@/components/PythonRunner";
import ScratchBlocks from "@/components/ScratchBlocks";
import { allPythonLessons } from "@/data/pythonCurriculum";
import { allScratchLessons } from "@/data/scratchCurriculum";

/** One lesson of the Python or Scratch track, with its pictures and its code. */
function LessonProbe({
  course,
  lesson,
}: {
  course: "Python" | "Scratch";
  lesson: {
    id: string;
    number: number;
    title: string;
    heroImage?: string;
    sections: {
      title: string;
      images?: string[];
      code?: string;
      starterCode?: string;
      solutionCode?: string;
    }[];
  };
}) {
  // Keyed by section as well as by name: two sections of a lesson can show the
  // same picture, and a key of the path alone would collide in React.
  const pictures = lesson.sections.flatMap((section, sectionIndex) =>
    (section.images ?? []).map(src => ({
      src,
      key: `${sectionIndex}:${src}`,
    }))
  );
  const cover = lesson.heroImage ? [{ src: lesson.heroImage, key: `cover:${lesson.heroImage}` }] : [];

  // One runner per lesson is enough to prove the interpreter works; running
  // every sample in the track would mean loading Pyodide hundreds of times.
  const sample =
    lesson.sections.find(section => section.starterCode)?.starterCode ??
    lesson.sections.find(section => section.solutionCode)?.solutionCode ??
    lesson.sections.find(section => section.code)?.code;

  return (
    <section data-probe={`${course}:${lesson.id}`} className="border-b p-4">
      <h2 className="font-bold">
        {String(lesson.number).padStart(2, "0")} · {lesson.title}
      </h2>
      <div className="flex flex-wrap gap-3 py-3">
        {[...cover, ...pictures].map(({ src, key }) => (
          <img
            key={key}
            src={src}
            alt={`${lesson.id} ${src}`}
            data-probe-image={src}
            className="h-24 w-32 rounded border object-contain"
          />
        ))}
      </div>
      {sample ? (
        course === "Python" ? (
          <PythonRunner
            code={sample}
            exampleLabel={`${lesson.id} sample`}
            runLabel="Run"
            copyLabel="Copied"
          />
        ) : (
          <ScratchBlocks
            code={sample}
            label={`${lesson.id} sample`}
            copyLabel="Copied"
          />
        )
      ) : (
        <p className="text-xs text-muted-foreground">no runnable sample</p>
      )}
    </section>
  );
}

function Harness() {
  return (
    <TooltipProvider>
      <main>
        {/* The real Web course page, exactly as the portal mounts it. */}
        <div data-probe="Web:course" id="web-course">
          <WebCourse studentName="Harness" accessCode="harness" />
        </div>

        {/* The other two tracks, section by section. */}
        {(["Python", "Scratch"] as const).map(course => (
          <div key={course} data-probe={`${course}:lessons`}>
            <h1 className="bg-slate-900 p-3 text-xl font-bold text-white">
              {course}
            </h1>
            {(course === "Python" ? allPythonLessons : allScratchLessons).map(
              lesson => (
                <LessonProbe key={lesson.id} course={course} lesson={lesson} />
              )
            )}
          </div>
        ))}
      </main>
    </TooltipProvider>
  );
}

createRoot(document.getElementById("harness")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>
);
