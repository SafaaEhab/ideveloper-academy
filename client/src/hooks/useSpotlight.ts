import { useCallback, type PointerEvent } from "react";

/**
 * Feeds the pointer position into `--spot-x` / `--spot-y` as percentages of the
 * element, which the `.spotlight::before` gradient in `index.css` reads to draw
 * a highlight under the cursor.
 *
 * Writing straight to the style attribute keeps hover tracking off the React
 * render path — a pointer move never triggers a re-render.
 */
export function useSpotlight() {
  return useCallback((event: PointerEvent<HTMLElement>) => {
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    node.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    node.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }, []);
}