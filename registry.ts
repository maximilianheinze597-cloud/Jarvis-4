import { z } from "zod";

export type ToolContext = {
  sessionId: string;
  conversationId?: string;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type ToolPermission = "safe" | "confirm";

export type ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  permission: ToolPermission;
  requiresConfirmation: boolean;
  schema: T;
  execute: (args: z.infer<T>, ctx: ToolContext) => Promise<ToolResult>;
  timeoutMs?: number;
};

const registry = new Map<string, ToolDefinition<z.ZodTypeAny>>();

export function registerTool<T extends z.ZodTypeAny>(tool: ToolDefinition<T>) {
  if (registry.has(tool.name)) {
    throw new Error(`Tool '${tool.name}' ist bereits registriert.`);
  }
  registry.set(tool.name, tool as ToolDefinition<z.ZodTypeAny>);
}

export function listTools() {
  return [...registry.values()];
}

export function listToolSpecsForModel() {
  return listTools().map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.schema),
    },
  }));
}

export async function executeToolByName(input: {
  tool: string;
  arguments: unknown;
  allowConfirmTools?: boolean;
  context: ToolContext;
}) {
  const tool = registry.get(input.tool);

  if (!tool) {
    return { ok: false, error: `Unbekanntes Tool: ${input.tool}` } satisfies ToolResult;
  }

  if (tool.permission === "confirm" && !input.allowConfirmTools) {
    return { ok: false, error: `Tool '${tool.name}' benötigt Bestätigung.` } satisfies ToolResult;
  }

  const parsed = tool.schema.safeParse(input.arguments);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Ungültige Tool-Parameter: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    } satisfies ToolResult;
  }

  const timeoutMs = tool.timeoutMs ?? 10_000;

  const timeout = new Promise<ToolResult>((resolve) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      resolve({ ok: false, error: `Tool '${tool.name}' Timeout (${timeoutMs}ms)` });
    }, timeoutMs);
  });

  const execution = tool.execute(parsed.data, input.context).catch((error) => {
    const message = error instanceof Error ? error.message : "Unbekannter Tool-Fehler";
    return { ok: false, error: message } satisfies ToolResult;
  });

  return Promise.race([execution, timeout]);
}
