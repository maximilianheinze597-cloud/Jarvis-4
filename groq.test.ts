import { beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
  process.env.JARVIS_SESSION_SECRET = "this-is-a-long-secret-12345";
  process.env.GROQ_API_KEY = "test-groq";
  process.env.GROQ_MODEL = "llama-3.3-70b-versatile";
  process.env.GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
});

describe("groq service", () => {
  test("handles plain assistant response", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "llama",
          choices: [{ message: { role: "assistant", content: "Hallo Commander" }, finish_reason: "stop" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    const { generateAssistantAnswer } = await import("@/lib/services/groq");

    const res = await generateAssistantAnswer({
      messages: [{ role: "user", content: "Hi" }],
      sessionId: "session-1",
    });

    expect(res.text).toContain("Hallo");
  });

  test("fails when key missing", async () => {
    delete process.env.GROQ_API_KEY;
    const { generateAssistantAnswer } = await import("@/lib/services/groq");
    await expect(
      generateAssistantAnswer({ messages: [{ role: "user", content: "Hi" }], sessionId: "session-2" }),
    ).rejects.toThrow(/GROQ_API_KEY fehlt/);
  });
});
