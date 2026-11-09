// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RouteMetadata from "./RouteMetadata";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("RouteMetadata", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.head.innerHTML =
      '<title>fallback</title><link rel="canonical" href="https://example.com/"><meta name="description" content="fallback">';
    window.history.replaceState(null, "", "/courses");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("applies the current route title and canonical URL", () => {
    act(() => root.render(<RouteMetadata />));
    expect(document.title).toBe("الكورسات | iDeveloper Academy");
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      "https://ideveloper-academy.vercel.app/courses",
    );
  });
});
