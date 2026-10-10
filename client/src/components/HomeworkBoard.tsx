import { Eye, ImageIcon, Lock } from "lucide-react";
import WebCodeRunner from "@/components/WebCodeRunner";

/**
 * The homework board: an empty frame for the picture, and an empty editor.
 *
 * Nothing is filled in on purpose. The session beside it carries the pictures
 * and the worked examples; the homework is the blank page the student builds
 * on, so the code has to start from nothing. A pre-filled file, a solution, or
 * a copyable target would all turn the exercise into a transcription, so the
 * board ships none of them - the editor opens blank and the frame waits.
 */
type Props = {
  /** The picture the student is measured against, when a session has one. */
  image?: string;
  /** Opens the picture full size. Left out where there is no lightbox. */
  onZoom?: (src: string, caption: string) => void;
  /** Shown inside the frame while it is empty. */
  placeholder: string;
  /** The line above the editor. */
  editorLabel: string;
  runLabel: string;
  copyLabel: string;
  /**
   * The file the editor opens on.
   *
   * Left out, the editor opens genuinely empty, which is what the HTML course
   * wants: the student is building the markup and has nothing to start from. A
   * CSS session cannot work that way. There, the page the rules attach to
   * already exists, and an empty box in front of it only tells the student that
   * a stylesheet has no stylesheet in it - so the track hands over the markup
   * with an empty `<style>` inside, and the CSS is still the student's to write.
   */
  starterCode?: string;
  /** Passed straight through to the editor — see `WebCodeRunner`. */
  autoRun?: boolean;
};

export default function HomeworkBoard({
  image,
  onZoom,
  placeholder,
  editorLabel,
  runLabel,
  copyLabel,
  starterCode = "",
  autoRun,
}: Props) {
  const picture = image && (
    <img
      src={image}
      alt={placeholder}
      loading="lazy"
      className="max-h-[420px] w-full bg-white object-contain"
    />
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-card/40">
        <div className="flex items-center gap-2 border-b border-dashed border-border/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          your result here
        </div>

        {picture ? (
          onZoom ? (
            <button
              type="button"
              onClick={() => onZoom(image, placeholder)}
              className="block w-full cursor-zoom-in"
            >
              {picture}
            </button>
          ) : (
            picture
          )
        ) : (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 p-6 text-center">
            <Eye className="h-6 w-6 text-muted-foreground/50" />
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              {placeholder}
            </p>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <Lock className="h-3 w-3" />
              empty on purpose
            </span>
          </div>
        )}
      </div>

      <WebCodeRunner
        code={starterCode}
        exampleLabel={editorLabel}
        runLabel={runLabel}
        copyLabel={copyLabel}
        autoRun={autoRun}
      />
    </div>
  );
}
