import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";

type CountUpProps = {
  value: number;
  duration?: number;
  className?: string;
  /** Rendered between the number and its unit, e.g. "+" or "–". */
  prefix?: string;
  suffix?: string;
};

/**
 * Ticks a number up from zero the first time it scrolls into view.
 *
 * The animation is driven from a rAF loop writing straight to `textContent`, so
 * it costs nothing per frame in React and stops the moment it lands. Reduced
 * motion skips straight to the final value.
 */
export default function CountUp({ value, duration = 1400, className, prefix = "", suffix = "" }: CountUpProps) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // Ease-out cubic, so it sprints then settles instead of crawling to a stop.
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}