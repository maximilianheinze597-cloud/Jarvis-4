import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const messageRoleEnum = pgEnum("message_role", ["system", "user", "assistant", "tool"]);

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  title: varchar("title", { length: 160 }).notNull().default("Neue Unterhaltung"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolName: varchar("tool_name", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

export const userSettings = pgTable("user_settings", {
  sessionId: varchar("session_id", { length: 64 }).primaryKey(),
  displayName: varchar("display_name", { length: 64 }).notNull().default("Commander"),
  language: varchar("language", { length: 20 }).notNull().default("de-DE"),
  voiceId: varchar("voice_id", { length: 128 }).notNull().default(""),
  groqModel: varchar("groq_model", { length: 80 }).notNull().default("llama-3.3-70b-versatile"),
  fishModel: varchar("fish_model", { length: 40 }).notNull().default("s2.1-pro"),
  speechRate: real("speech_rate").notNull().default(1),
  autoSpeak: boolean("auto_speak").notNull().default(true),
  pushToTalk: boolean("push_to_talk").notNull().default(true),
  handsFreeMode: boolean("hands_free_mode").notNull().default(false),
  persistHistory: boolean("persist_history").notNull().default(true),
  autoPlayAudio: boolean("auto_play_audio").notNull().default(true),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  accentColor: varchar("accent_color", { length: 20 }).notNull().default("cyan"),
  confirmActions: boolean("confirm_actions").notNull().default(true),
  integrations: jsonb("integrations").notNull().default({
    calendar: false,
    reminders: false,
    tasks: false,
    weather: false,
    webSearch: false,
    smartHome: false,
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  conversationId: uuid("conversation_id"),
  level: varchar("level", { length: 16 }).notNull().default("info"),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  message: text("message").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assistantSessions = pgTable("assistant_sessions", {
  sessionId: varchar("session_id", { length: 64 }).primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  requestCount: integer("request_count").notNull().default(0),
});
