import { useEffect, useRef, useState } from "react";

type Options = {
  /** Fraction of the element that must be visible before it counts as seen. */
  threshold?: number;
  /** Shrinks the viewport box from the bottom, so reveals fire slightly late. */
  rootMargin?: string;
  /** Re-arm the observer after every entry, for elements that can leave again. */
  repeat?: boolean;
};

/**
 * Reports when an element scrolls into view.
 *
 * The landing page uses this for scroll reveals and the stat counters. Elements
 * animate once and then stop, so the observer disconnects after the first hit —
 * a long page can hold dozens of observed nodes and none of them keep working
 * after their entrance.
 *
 * Anything the environment cannot measure (no `IntersectionObserver`, or a
 * visitor who asked for reduced motion) is reported as visible immediately, so
 * content is never left stuck at `opacity: 0`.
 */
export function useInView<T extends Element>({ threshold = 0.15, rootMargin = "0px 0px -8% 0px", repeat = false }: Options = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }

    let seen = false;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            seen = true;
            setInView(true);
          } else if (repeat) {
            setInView(false);
          }
        }
        // Only stand down once the element has actually been seen. An observer
        // fires an initial report for everything it watches, and for anything
        // below the fold that report is "not intersecting" — disconnecting on it
        // would strand the element at opacity 0 forever.
        if (seen && !repeat) observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, repeat]);

  return [ref, inView] as const;
}