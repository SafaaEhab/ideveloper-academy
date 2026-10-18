import type { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  /** Any element that forwards a DOM ref — `div`, `section`, `li`, `article`. */
  as?: ElementType;
  className?: string;
  /** Stagger, in milliseconds. Use it to fan a grid out row by row. */
  delay?: number;
  /** Starting offset in pixels. Small values read as a settle; large ones slide. */
  y?: number;
  /** Starting offset along the inline axis. Positive slides in from the right. */
  x?: number;
};

/**
 * Fades and lifts its children into place the first time they scroll into view.
 *
 * Only `opacity` and `transform` are animated, and both are handed to the
 * compositor, so a long page full of reveals stays on the frame budget. The
 * transition itself lives in `index.css` under `.reveal`.
 */
export default function Reveal({ children, as: Tag = "div", className, delay = 0, y = 24, x = 0 }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      className={cn("reveal", inView && "is-revealed", className)}
      style={{ "--reveal-delay": `${delay}ms`, "--reveal-y": `${y}px`, "--reveal-x": `${x}px` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}