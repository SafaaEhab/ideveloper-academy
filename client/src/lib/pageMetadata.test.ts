// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  applyPageMetadata,
  canonicalPathFor,
  metadataForPath,
  SITE_ORIGIN,
} from "./pageMetadata";

afterEach(() => {
  document.head.innerHTML = "";
  document.title = "";
});

describe("route metadata", () => {
  it("normalizes canonical paths without a trailing slash or query", () => {
    expect(canonicalPathFor("/")).toBe("/");
    expect(canonicalPathFor("/courses/")).toBe("/courses");
    expect(canonicalPathFor("/instructor/group/12/")).toBe("/instructor/group/12");
  });

  it("gives every public route a distinct title and canonical URL", () => {
    const paths = [
      "/",
      "/courses",
      "/register",
      "/terms",
      "/privacy",
      "/login",
      "/student",
      "/instructor",
      "/admin",
      "/leads",
    ];
    const titles = paths.map(path => metadataForPath(path).title);
    const canonicals = paths.map(path => metadataForPath(path).canonicalPath);

    expect(new Set(titles).size).toBe(paths.length);
    expect(new Set(canonicals).size).toBe(paths.length);
    expect(metadataForPath("/courses").canonicalPath).toBe("/courses");
    expect(metadataForPath("/").title).toContain("iDeveloper Academy");
  });

  it("uses the unknown-route metadata (and keeps the path) for a miss", () => {
    const metadata = metadataForPath("/does-not-exist");
    expect(metadata.title).toContain("Page not found");
    expect(metadata.canonicalPath).toBe("/does-not-exist");
  });

  it("updates the existing head nodes instead of creating duplicates", () => {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
    const description = document.createElement("meta");
    description.name = "description";
    document.head.appendChild(description);

    applyPageMetadata(metadataForPath("/courses"));

    expect(document.title).toBe("الكورسات | iDeveloper Academy");
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(canonical.href).toBe(`${SITE_ORIGIN}/courses`);
    expect(description.content).toContain("Scratch");
  });
});
