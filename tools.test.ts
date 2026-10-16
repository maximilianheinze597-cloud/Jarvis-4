import { beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("tool registry and permissions", () => {
  test("registers and executes a safe tool", async () => {
    const { registerTool, executeToolByName } = await import("@/lib/tools/registry");
    const { z } = await import("zod");

    registerTool({
      name: "unit_safe",
      description: "safe",
      permission: "safe",
      requiresConfirmation: false,
      schema: z.object({ value: z.number() }),
      execute: async ({ value }) => ({ ok: true, data: value * 2 }),
    });

    const result = await executeToolByName({
      tool: "unit_safe",
      arguments: { value: 4 },
      context: { sessionId: "abc" },
    });

    expect(result.ok).toBe(true);
    expect(result.data).toBe(8);
  });

  test("blocks confirm tools without permission", async () => {
    const { registerTool, executeToolByName } = await import("@/lib/tools/registry");
    const { z } = await import("zod");

    registerTool({
      name: "unit_confirm",
      description: "confirm",
      permission: "confirm",
      requiresConfirmation: true,
      schema: z.object({}),
      execute: async () => ({ ok: true, data: "ok" }),
    });

    const result = await executeToolByName({
      tool: "unit_confirm",
      arguments: {},
      context: { sessionId: "abc" },
      allowConfirmTools: false,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("benötigt Bestätigung");
  });
});
