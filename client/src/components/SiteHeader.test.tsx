// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn(), switchable: true }),
}));

import SiteHeader from "@/components/SiteHeader";

describe("SiteHeader mobile navigation", () => {
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

  it("renders a menu trigger with an explicit expanded state", () => {
    act(() => root.render(<SiteHeader />));
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="فتح القائمة"]',
    );
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.getAttribute("aria-controls")).toBe("site-mobile-menu");
  });

  it("opens a dialog containing the primary navigation links", () => {
    act(() => root.render(<SiteHeader />));
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="فتح القائمة"]',
    )!;

    act(() => trigger.click());

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("الرئيسية");
    expect(dialog?.textContent).toContain("الكورسات");
    expect(dialog?.textContent).toContain("التسجيل");
  });
});
