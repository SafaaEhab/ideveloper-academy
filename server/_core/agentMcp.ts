/**
 * Public, read-only MCP server (Streamable HTTP, stateless JSON responses).
 *
 * Only the academy's public catalogue is exposed: courses, achievements and the
 * current announcement. No student, instructor or admin data is reachable, and
 * no tool accepts a database identifier. The endpoint is deliberately tiny so
 * it can run on the 256 MB free plan.
 */
import type { Express, Request, Response } from "express";
import { getActiveAnnouncement, listAchievements, listCourseOfferings } from "../db";
import { checkRateLimit, rateLimitKey } from "./password";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = {
  name: "ideveloper-academy",
  title: "iDeveloper Academy",
  version: "1.0.0",
  description:
    "Public course catalogue, achievements and announcement for iDeveloper Academy in Banha, Egypt.",
  websiteUrl: "https://ideveloper-academy.vercel.app",
};

const TOOLS = [
  {
    name: "list_courses",
    title: "List public courses",
    description:
      "Return every academy course with its current availability (live, coming soon or waiting list).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_achievements",
    title: "Get public achievements",
    description: "Return the academy's published achievement cards, newest first.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_announcement",
    title: "Get the current announcement",
    description:
      "Return the currently enabled public announcement, or null when no popup is active.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

type JsonRpcId = string | number | null;

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function runTool(name: string): Promise<unknown> {
  switch (name) {
    case "list_courses":
      return (await listCourseOfferings()).map(row => ({
        course: row.course,
        status: row.status,
        updatedAt: row.updatedAt,
      }));
    case "get_achievements":
      return (await listAchievements()).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        achievedOn: row.achievedOn,
        imageUrl: row.imageUrl,
        tag: row.tag,
      }));
    case "get_announcement":
      return getActiveAnnouncement();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleMessage(message: Record<string, unknown>) {
  const id = (message.id as JsonRpcId | undefined) ?? null;
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(id, -32600, "Invalid JSON-RPC request");
  }

  const method = message.method;
  const params = (message.params ?? {}) as Record<string, unknown>;

  switch (method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION;
      return rpcResult(id, {
        protocolVersion: requested,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    }
    case "notifications/initialized":
      // A notification, not a request: no response is expected.
      return null;
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      if (!TOOLS.some(tool => tool.name === name)) {
        return rpcError(id, -32602, `Unknown tool: ${name || "(missing)"}`);
      }
      try {
        const data = await runTool(name);
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(data) }],
          structuredContent: data,
          isError: false,
        });
      } catch (error) {
        return rpcResult(id, {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : "The tool could not run",
            },
          ],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export function registerAgentMcpRoute(app: Express): void {
  app.options("/mcp", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Protocol-Version");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.status(204).end();
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (!checkRateLimit(rateLimitKey(req, "mcp"), 120)) {
      res.status(429).json(rpcError(null, -32000, "Too many MCP requests. Try again later."));
      return;
    }

    const body = req.body as unknown;
    const messages = Array.isArray(body)
      ? body
      : body && typeof body === "object"
        ? [body as Record<string, unknown>]
        : [];
    if (messages.length === 0) {
      res.status(400).json(rpcError(null, -32700, "Parse error"));
      return;
    }

    const responses = [];
    for (const message of messages) {
      if (!message || typeof message !== "object") {
        responses.push(rpcError(null, -32600, "Invalid JSON-RPC request"));
        continue;
      }
      const response = await handleMessage(message as Record<string, unknown>);
      if (response) responses.push(response);
    }

    // A batch made only of notifications is acknowledged with 202 and no body.
    if (responses.length === 0) {
      res.status(202).end();
      return;
    }
    res.json(Array.isArray(body) ? responses : responses[0]);
  });

  app.get("/mcp", (_req, res) => {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json(rpcError(null, -32000, "This MCP server is stateless; send a POST request."));
  });
}
