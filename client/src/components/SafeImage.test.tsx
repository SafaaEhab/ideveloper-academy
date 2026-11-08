// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SafeImage, { ACHIEVEMENT_PLACEHOLDER } from "@/components/SafeImage";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SafeImage", () => {
  it("renders the requested source while it is valid", () => {
    act(() => {
      root.render(<SafeImage src="https://example.com/a.png" alt="A result" />);
    });
    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe("https://example.com/a.png");
    expect(image.getAttribute("alt")).toBe("A result");
  });

  it("swaps to the local placeholder when the request fails", () => {
    act(() => {
      root.render(<SafeImage src="https://example.com/missing.png" alt="A result" />);
    });
    const image = container.querySelector("img")!;
    act(() => {
      image.dispatchEvent(new Event("error"));
    });
    expect(container.querySelector("img")!.getAttribute("src")).toBe(
      ACHIEVEMENT_PLACEHOLDER,
    );
    // The description is still available to assistive technology.
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("A result");
  });

  it("uses the placeholder when no source was supplied", () => {
    act(() => {
      root.render(<SafeImage src="" alt="No photo" />);
    });
    expect(container.querySelector("img")!.getAttribute("src")).toBe(
      ACHIEVEMENT_PLACEHOLDER,
    );
  });
});
