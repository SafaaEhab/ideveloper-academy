import { ZoomIn } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  onZoom: (src: string, alt: string) => void;
};

/**
 * Every lesson figure gets the same calm frame: soft canvas, fixed height,
 * click to zoom. Keeps screenshots readable in both light and dark mode.
 */
export default function WebFigure({ src, alt, onZoom }: Props) {
  return (
    <button
      type="button"
      onClick={() => onZoom(src, alt)}
      aria-label={`Zoom: ${alt}`}
      title="Click to zoom"
      className="group relative flex h-[200px] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 md:h-[240px]"
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        className="h-full w-full cursor-zoom-in object-contain"
      />
      <span className="pointer-events-none absolute bottom-2 end-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white opacity-0 transition group-hover:opacity-100">
        <ZoomIn className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
