import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JARVIS_SESSION_SECRET: z.string().min(16).default("development-session-secret-change-me"),
  JARVIS_APP_URL: z.string().url().optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
  GROQ_API_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  FISH_AUDIO_API_KEY: z.string().min(1).optional(),
  FISH_AUDIO_VOICE_ID: z.string().min(1).optional(),
  FISH_AUDIO_API_BASE_URL: z.string().url().default("https://api.fish.audio"),
  FISH_AUDIO_MODEL: z.string().min(1).default("s2.1-pro"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Ungültige Serverkonfiguration: ${details}`);
  }

  cached = parsed.data;
  return cached;
}

export function hasGroqConfig() {
  const env = getServerEnv();
  return Boolean(env.GROQ_API_KEY);
}

export function hasFishConfig() {
  const env = getServerEnv();
  return Boolean(env.FISH_AUDIO_API_KEY && env.FISH_AUDIO_VOICE_ID);
}
