import { beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
  process.env.JARVIS_SESSION_SECRET = "this-is-a-long-secret-12345";
  process.env.FISH_AUDIO_API_KEY = "test-key";
  process.env.FISH_AUDIO_VOICE_ID = "voice-id";
  process.env.FISH_AUDIO_API_BASE_URL = "https://api.fish.audio";
  process.env.FISH_AUDIO_MODEL = "s2.1-pro";
});

describe("fish service", () => {
  test("throws if api key missing", async () => {
    delete process.env.FISH_AUDIO_API_KEY;
    const { synthesizeFishAudio } = await import("@/lib/services/fish");
    await expect(synthesizeFishAudio({ text: "Hallo" })).rejects.toThrow(/FISH_AUDIO_API_KEY fehlt/);
  });

  test("returns audio buffer on success", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }),
    ) as unknown as typeof fetch;

    const { synthesizeFishAudio } = await import("@/lib/services/fish");
    const result = await synthesizeFishAudio({ text: "Hallo" });

    expect(result.contentType).toContain("audio");
    expect(result.buffer.byteLength).toBeGreaterThan(0);
  });
});
