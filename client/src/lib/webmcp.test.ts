// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerPublicWebMcpTools } from "@/lib/webmcp";

type Registered = {
  tool: {
    name: string;
    inputSchema: any;
    execute: (input: Record<string, unknown>) => Promise<unknown>;
  };
  options?: { signal?: AbortSignal };
};

let registered: Registered[] = [];
let registerTool: ReturnType<typeof vi.fn>;

beforeEach(() => {
  registered = [];
  registerTool = vi.fn((tool: Registered["tool"], options?: Registered["options"]) => {
    registered.push({ tool, options });
    return Promise.resolve();
  });
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: { registerTool },
  });
});

afterEach(() => {
  delete (document as any).modelContext;
  vi.unstubAllGlobals();
});

describe("WebMCP progressive enhancement", () => {
  it("registers only public, read-only tools", () => {
    const cleanup = registerPublicWebMcpTools();
    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(registered.map(item => item.tool.name).sort()).toEqual([
      "open_public_page",
      "search_public_courses",
    ]);
    expect(registered.every(item => item.options?.signal instanceof AbortSignal)).toBe(true);
    cleanup();
    expect(registered.every(item => item.options?.signal?.aborted)).toBe(true);
  });

  it("searches the public course endpoint and validates input", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        result: { data: { json: [
          { course: "Python", status: "live" },
          { course: "Scratch", status: "coming_soon" },
        ] } },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    registerPublicWebMcpTools();
    const search = registered.find(item => item.tool.name === "search_public_courses")!.tool;
    await expect(search.execute({ query: "py" })).resolves.toEqual({
      query: "py",
      courses: [{ course: "Python", status: "live" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trpc/site.courses",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
  });

  it("refuses private pages and does nothing when the API is absent", async () => {
    registerPublicWebMcpTools();
    const open = registered.find(item => item.tool.name === "open_public_page")!.tool;
    await expect(open.execute({ path: "/admin" })).rejects.toThrow(/not a public academy page/);
    expect(open.inputSchema.properties.path.enum).not.toContain("/admin");

    delete (document as any).modelContext;
    expect(() => registerPublicWebMcpTools()).not.toThrow();
  });
});
