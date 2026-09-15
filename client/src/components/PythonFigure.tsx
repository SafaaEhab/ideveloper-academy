type Props = {
  src: string;
  alt: string;
  onZoom: (src: string, alt: string) => void;
};

/**
 * One calm frame for every curriculum image:
 * same soft canvas, same size, same rounded corners — no headers, no labels.
 * Soft neutral background keeps screenshots easy on the eyes in light/dark mode.
 */
export default function PythonFigure({ src, alt, onZoom }: Props) {
  return (
    <button
      type="button"
      onClick={() => onZoom(src, alt)}
      aria-label={alt}
      className="group flex h-[240px] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:h-[280px]"
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        className="h-full w-full cursor-zoom-in rounded-lg object-contain"
      />
    </button>
  );
}
