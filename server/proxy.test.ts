import { afterEach, describe, expect, it, vi } from "vitest";
import proxy from "../proxy";

afterEach(() => vi.unstubAllGlobals());

describe("Markdown routing middleware", () => {
  it("returns Markdown for eligible public pages", async () => {
    const fetchMock = vi.fn(async () => new Response("# Courses", {
      status: 200,
      headers: { "content-type": "text/markdown; charset=utf-8" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await proxy(
      new Request("https://ideveloper-academy.vercel.app/courses", {
        headers: { accept: "text/markdown" },
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://ideveloper-academy.vercel.app/api/markdown?path=%2Fcourses"),
      expect.objectContaining({ headers: { accept: "text/markdown" } }),
    );
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("vary")).toBe("Accept");
    expect(await response.text()).toBe("# Courses");
  });

  it("leaves normal HTML requests untouched", async () => {
    const response = await proxy(
      new Request("https://ideveloper-academy.vercel.app/", {
        headers: { accept: "text/html" },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("never negotiates Markdown for private or unsupported paths", async () => {
    const response = await proxy(
      new Request("https://ideveloper-academy.vercel.app/admin", {
        headers: { accept: "text/markdown" },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
