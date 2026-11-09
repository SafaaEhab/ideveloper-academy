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

  it("serves the SPA shell with HTTP 404 for an unknown route", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("<!doctype html><title>app</title>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(
      new Request("https://ideveloper-academy.vercel.app/this-route-does-not-exist", {
        headers: { accept: "text/html" },
      }),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.text()).toContain("<title>app</title>");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://ideveloper-academy.vercel.app/index.html"),
      expect.objectContaining({ headers: { accept: "text/html" } }),
    );
  });

  it("also marks the explicit /404 page as HTTP 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html></html>", { status: 200 })),
    );
    const response = await proxy(
      new Request("https://ideveloper-academy.vercel.app/404"),
    );
    expect(response.status).toBe(404);
  });

  it("treats instructor group and student detail URLs as known routes", async () => {
    for (const path of [
      "/instructor",
      "/instructor/analytics",
      "/instructor/group/12",
      "/instructor/group/12/student/7",
      "/instructor/group/12/",
    ]) {
      const response = await proxy(
        new Request(`https://ideveloper-academy.vercel.app${path}`),
      );
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }
  });

  it("never intercepts static assets", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const path of ["/assets/index.js", "/images/logo.png", "/api.md"]) {
      const response = await proxy(
        new Request(`https://ideveloper-academy.vercel.app${path}`),
      );
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
