// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, refresh: async () => ({ data: null }) }),
}));

import Login from "@/pages/Login";

describe("Login page heading", () => {
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

  it("exposes the sign-in title as a visible H1", () => {
    act(() => root.render(<Login />));
    const heading = container.querySelector("h1");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe("Sign in");
  });

  it("keeps a single H1 when switching to signup", () => {
    act(() => root.render(<Login />));
    const signup = Array.from(container.querySelectorAll("button")).find(
      button => button.textContent === "Create an account",
    );
    expect(signup).toBeTruthy();

    act(() => signup!.click());

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Create your account");
  });
});
