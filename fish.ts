import { getServerEnv } from "@/lib/env";

export type TtsInput = {
  text: string;
  voiceId?: string;
  format?: "mp3" | "wav" | "opus";
  speed?: number;
  language?: string;
};

export type TtsOutput = {
  buffer: ArrayBuffer;
  contentType: string;
};

const MIME: Record<NonNullable<TtsInput["format"]>, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  opus: "audio/ogg",
};

export async function synthesizeFishAudio(input: TtsInput, signal?: AbortSignal): Promise<TtsOutput> {
  const env = getServerEnv();

  if (!env.FISH_AUDIO_API_KEY) {
    throw new Error("FISH_AUDIO_API_KEY fehlt. Bitte Server-Konfiguration prüfen.");
  }

  const voiceId = input.voiceId || env.FISH_AUDIO_VOICE_ID;
  if (!voiceId) {
    throw new Error("FISH_AUDIO_VOICE_ID fehlt. Bitte Stimme in den Einstellungen oder der Umgebung konfigurieren.");
  }

  const format = input.format ?? "mp3";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40_000);
  const linkedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const res = await fetch(`${env.FISH_AUDIO_API_BASE_URL}/v1/tts`, {
      method: "POST",
      signal: linkedSignal,
      headers: {
        Authorization: `Bearer ${env.FISH_AUDIO_API_KEY}`,
        "Content-Type": "application/json",
        model: env.FISH_AUDIO_MODEL,
      },
      body: JSON.stringify({
        text: input.text,
        reference_id: voiceId,
        format,
        normalize: true,
        language: input.language || "de-DE",
        prosody: {
          speed: Math.max(0.7, Math.min(1.4, input.speed ?? 1)),
          volume: 0,
          normalize_loudness: true,
        },
        latency: "balanced",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) throw new Error("Fish Audio API-Key ist ungültig.");
      if (res.status === 429) throw new Error("Fish Audio Rate-Limit erreicht.");
      if (res.status === 400) throw new Error("Fish Audio Anfrage ungültig (z. B. Voice-ID oder Parameter)." );
      throw new Error(`Fish Audio Fehler (${res.status}): ${text.slice(0, 200)}`);
    }

    const buffer = await res.arrayBuffer();
    return {
      buffer,
      contentType: res.headers.get("content-type") || MIME[format],
    };
  } finally {
    clearTimeout(timeout);
  }
}
