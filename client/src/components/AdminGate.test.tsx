// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// `useAuth` and the request form both reach for trpc; neither is what this file
// is checking, so both are replaced with the smallest thing that renders.
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, refresh: async () => ({ data: mockUser }), loading: false }),
}));
vi.mock("@/components/AccessRequestForm", () => ({
  default: () => <div data-testid="request-form" />,
}));

import AdminGate from "@/components/AdminGate";

let mockUser: unknown = null;

/**
 * The gate is the only thing between a visitor and the workspace, so it has to
 * offer both ways in: the password they already chose, or a request for one they
 * have not. These pin that down.
 */
describe("AdminGate", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockUser = null;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const render = () => act(() => root.render(<AdminGate />));

  const click = (label: string) => {
    const button = [...host.querySelectorAll("button")].find(node =>
      node.textContent?.includes(label),
    );
    if (!button) throw new Error(`No button labelled "${label}"`);
    act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  };

  it("asks for a password first, and never pre-fills an email", () => {
    render();

    expect(host.querySelector("#gate-email")).not.toBeNull();
    expect(host.querySelector("#gate-password")).not.toBeNull();
    // The email box must start empty: nothing on this page should put an address
    // on screen that the visitor did not type themselves.
    expect(host.querySelector<HTMLInputElement>("#gate-email")?.value).toBe("");
    expect(host.textContent).not.toContain("@gmail.com");
  });

  it("offers the request form to someone without an account", () => {
    render();
    expect(host.querySelector("[data-testid='request-form']")).toBeNull();

    click("Request access");

    expect(host.querySelector("[data-testid='request-form']")).not.toBeNull();
    expect(host.querySelector("#gate-password")).toBeNull();
  });

  it("sends a signed-in visitor straight to the request form", () => {
    mockUser = { email: "visitor@example.test", name: "Visitor", role: "user" };
    render();

    // No point offering sign-in to someone already signed in.
    expect(host.querySelector("[data-testid='request-form']")).not.toBeNull();
    expect(host.textContent).toContain("no access yet");
  });

  it("can go back from the request form to signing in", () => {
    render();
    click("Request access");
    click("I have an account");

    expect(host.querySelector("#gate-password")).not.toBeNull();
    expect(host.querySelector("[data-testid='request-form']")).toBeNull();
  });
});
