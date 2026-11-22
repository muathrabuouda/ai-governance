// A minimal MCP server over stdio, written by hand (no SDK) so every line is visible.
// Transport: one JSON-RPC 2.0 message per line on stdin/stdout.
// Rule: stdout carries protocol messages only. Every log goes to stderr.
import { createInterface } from "node:readline";
import { getStory } from "../golden-project/scripts/story.mjs";

const log = (...a) => console.error("[stories]", ...a);
const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

const TOOLS = [
  {
    name: "get_story",
    description:
      "Return one user story from docs/02-spec.md with its acceptance criteria (Given/When/Then), " +
      "and nothing else. Use it before implementing or testing a story. " +
      "If the number does not exist, the error lists the available story numbers.",
    inputSchema: {
      type: "object",
      properties: { number: { type: "integer", minimum: 1, description: "Story number, e.g. 4" } },
      required: ["number"],
    },
  },
];

function handle(req) {
  const { method, params = {} } = req;
  switch (method) {
    case "initialize":
      return {
        protocolVersion: params.protocolVersion ?? "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "mawid-stories", version: "0.1.0" },
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      if (params.name !== "get_story") throw { code: -32602, message: `Unknown tool: ${params.name}` };
      const n = Number(params.arguments?.number);
      if (!Number.isInteger(n) || n < 1)
        return {
          content: [{ type: "text", text: "number must be a positive integer, e.g. 4" }],
          isError: true,
        };
      const r = getStory(n);
      return { content: [{ type: "text", text: r.text }], isError: !r.ok };
    }
    default:
      throw { code: -32601, message: `Method not found: ${method}` };
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
  if (req.id === undefined) {
    log("notification:", req.method);
    return;
  } // notifications get no reply
  try {
    send({ jsonrpc: "2.0", id: req.id, result: handle(req) });
  } catch (e) {
    send({ jsonrpc: "2.0", id: req.id, error: { code: e.code ?? -32603, message: e.message ?? String(e) } });
  }
});
log("ready");
