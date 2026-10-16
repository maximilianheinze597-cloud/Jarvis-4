import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/chat-store";
import { enforceRateLimit, noStoreJson } from "@/lib/http";
import { getOrCreateSessionId } from "@/lib/session";
import { synthesizeFishAudio } from "@/lib/services/fish";

const schema = z.object({
  text: z.string().min(1).max(3000),
  voiceId: z.string().max(128).optional(),
  format: z.enum(["mp3", "wav", "opus"]).default("mp3"),
  speed: z.number().min(0.7).max(1.4).optional(),
  language: z.string().min(2).max(20).optional(),
  conversationId: z.string().uuid().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "tts:post", 12, 60_000);
  if (limited) return limited;

  const sessionId = await getOrCreateSessionId();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "invalid_json" }, 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: "invalid_payload", message: "Ungültige TTS-Parameter." }, 400);
  }

  try {
    const audio = await synthesizeFishAudio(parsed.data);

    await logActivity({
      sessionId,
      conversationId: parsed.data.conversationId,
      eventType: "audio_generated",
      message: "Audio erfolgreich erzeugt",
      details: { format: parsed.data.format },
    });

    return new NextResponse(audio.buffer, {
      status: 200,
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS-Fehler";

    await logActivity({
      sessionId,
      conversationId: parsed.data.conversationId,
      eventType: "audio_failed",
      level: "error",
      message: "Audioerzeugung fehlgeschlagen",
      details: { error: message },
    });

    return noStoreJson({ error: "tts_failed", message }, 500);
  }
}
