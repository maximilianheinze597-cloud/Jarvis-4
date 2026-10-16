import { z } from "zod";

export const settingsSchema = z.object({
  displayName: z.string().min(1).max(64),
  language: z.string().min(2).max(20),
  voiceId: z.string().max(128),
  groqModel: z.string().min(2).max(80),
  fishModel: z.string().min(2).max(40),
  speechRate: z.number().min(0.7).max(1.4),
  autoSpeak: z.boolean(),
  pushToTalk: z.boolean(),
  handsFreeMode: z.boolean(),
  persistHistory: z.boolean(),
  autoPlayAudio: z.boolean(),
  reducedMotion: z.boolean(),
  accentColor: z.enum(["cyan", "teal", "orange"]),
  confirmActions: z.boolean(),
  integrations: z.object({
    calendar: z.boolean(),
    reminders: z.boolean(),
    tasks: z.boolean(),
    weather: z.boolean(),
    webSearch: z.boolean(),
    smartHome: z.boolean(),
  }),
});

export type JarvisSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: JarvisSettings = {
  displayName: "Commander",
  language: "de-DE",
  voiceId: "",
  groqModel: "llama-3.3-70b-versatile",
  fishModel: "s2.1-pro",
  speechRate: 1,
  autoSpeak: true,
  pushToTalk: true,
  handsFreeMode: false,
  persistHistory: true,
  autoPlayAudio: true,
  reducedMotion: false,
  accentColor: "cyan",
  confirmActions: true,
  integrations: {
    calendar: false,
    reminders: false,
    tasks: false,
    weather: false,
    webSearch: false,
    smartHome: false,
  },
};
