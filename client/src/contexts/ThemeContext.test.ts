import { describe, expect, it, vi } from "vitest";
import { getInitialTheme } from "./ThemeContext";

describe("theme persistence", () => {
  it("restores the saved preference when the app is recreated", () => {
    vi.stubGlobal("window", { location: { search: "" } });
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "light") });
    expect(getInitialTheme("dark")).toBe("light");
    vi.unstubAllGlobals();
  });
});
