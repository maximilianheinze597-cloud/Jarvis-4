import { describe, expect, test, vi, beforeEach } from "vitest";

describe("env validation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...process.env,
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
      JARVIS_SESSION_SECRET: "this-is-a-long-secret-12345",
      GROQ_MODEL: "llama-3.3-70b-versatile",
      GROQ_API_BASE_URL: "https://api.groq.com/openai/v1",
      FISH_AUDIO_API_BASE_URL: "https://api.fish.audio",
      FISH_AUDIO_MODEL: "s2.1-pro",
    };
  });

  test("loads valid env", async () => {
    const mod = await import("@/lib/env");
    const env = mod.getServerEnv();
    expect(env.DATABASE_URL).toContain("postgresql://");
  });

  test("throws on invalid env", async () => {
    process.env.JARVIS_SESSION_SECRET = "short";
    const mod = await import("@/lib/env");
    expect(() => mod.getServerEnv()).toThrow(/Ungültige Serverkonfiguration/);
  });
});
