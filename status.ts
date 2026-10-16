import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getServerEnv } from "@/lib/env";

export type ServiceState = "online" | "offline" | "unknown" | "not_configured";

export type ServicesStatus = {
  backend: ServiceState;
  database: ServiceState;
  groq: ServiceState;
  fishAudio: ServiceState;
  checkedAt: string;
  details: Record<string, string>;
};

async function checkDb() {
  try {
    await db.execute(sql`select 1`);
    return "online" as const;
  } catch {
    return "offline" as const;
  }
}

async function probeGroq(apiKey: string, baseUrl: string, model: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_completion_tokens: 5,
        temperature: 0,
      }),
    });

    if (!res.ok) return "offline" as const;
    return "online" as const;
  } catch {
    return "unknown" as const;
  } finally {
    clearTimeout(timeout);
  }
}

async function probeFish(apiKey: string, baseUrl: string, model: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(`${baseUrl}/v1/tts`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        model,
      },
      body: JSON.stringify({
        text: "Test",
        format: "mp3",
      }),
    });

    if (!res.ok) return "offline" as const;
    return "online" as const;
  } catch {
    return "unknown" as const;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServicesStatus({ probe = false }: { probe?: boolean } = {}): Promise<ServicesStatus> {
  const env = getServerEnv();

  const details: Record<string, string> = {};
  const database = await checkDb();

  const backend: ServiceState = "online";

  let groq: ServiceState = env.GROQ_API_KEY ? "unknown" : "not_configured";
  let fishAudio: ServiceState = env.FISH_AUDIO_API_KEY ? "unknown" : "not_configured";

  if (probe && env.GROQ_API_KEY) {
    groq = await probeGroq(env.GROQ_API_KEY, env.GROQ_API_BASE_URL, env.GROQ_MODEL);
  }

  if (probe && env.FISH_AUDIO_API_KEY) {
    fishAudio = await probeFish(env.FISH_AUDIO_API_KEY, env.FISH_AUDIO_API_BASE_URL, env.FISH_AUDIO_MODEL);
  }

  if (!env.FISH_AUDIO_VOICE_ID) {
    details.fishVoice = "FISH_AUDIO_VOICE_ID fehlt";
  }

  return {
    backend,
    database,
    groq,
    fishAudio,
    checkedAt: new Date().toISOString(),
    details,
  };
}
