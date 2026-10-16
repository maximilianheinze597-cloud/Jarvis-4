import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { conversations, userSettings } from "@/db/schema";
import { getServicesStatus } from "@/lib/services/status";
import { registerTool } from "@/lib/tools/registry";

let initialized = false;

export function registerBuiltinTools() {
  if (initialized) return;

  registerTool({
    name: "get_local_time",
    description: "Gibt die aktuelle lokale Uhrzeit zurück.",
    permission: "safe",
    requiresConfirmation: false,
    schema: z.object({}),
    execute: async () => ({
      ok: true,
      data: {
        time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
    }),
  });

  registerTool({
    name: "get_local_date",
    description: "Gibt das lokale Datum zurück.",
    permission: "safe",
    requiresConfirmation: false,
    schema: z.object({}),
    execute: async () => ({
      ok: true,
      data: {
        date: new Date().toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      },
    }),
  });

  registerTool({
    name: "get_system_status",
    description: "Prüft den Verfügbarkeitsstatus der JARVIS-Dienste.",
    permission: "safe",
    requiresConfirmation: false,
    schema: z.object({ probe: z.boolean().default(false) }),
    execute: async (args) => {
      const status = await getServicesStatus({ probe: args.probe });
      return { ok: true, data: status };
    },
  });

  registerTool({
    name: "get_session_info",
    description: "Zeigt Informationen zur aktuellen Sitzung.",
    permission: "safe",
    requiresConfirmation: false,
    schema: z.object({}),
    execute: async (_, ctx) => {
      const latestConversation = await db.query.conversations.findFirst({
        where: eq(conversations.sessionId, ctx.sessionId),
        orderBy: desc(conversations.updatedAt),
      });

      return {
        ok: true,
        data: {
          sessionId: ctx.sessionId,
          activeConversationId: ctx.conversationId ?? null,
          latestConversationId: latestConversation?.id ?? null,
        },
      };
    },
  });

  registerTool({
    name: "get_app_settings",
    description: "Liest die aktuellen JARVIS-Einstellungen aus.",
    permission: "safe",
    requiresConfirmation: false,
    schema: z.object({}),
    execute: async (_, ctx) => {
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.sessionId, ctx.sessionId),
      });
      return { ok: true, data: settings ?? null };
    },
  });

  registerTool({
    name: "start_new_conversation",
    description: "Startet eine neue Unterhaltung.",
    permission: "safe",
    requiresConfirmation: false,
    schema: z.object({ title: z.string().max(160).optional() }),
    execute: async (args, ctx) => {
      const [conversation] = await db
        .insert(conversations)
        .values({
          sessionId: ctx.sessionId,
          title: args.title?.trim() || "Neue Unterhaltung",
        })
        .returning();

      return { ok: true, data: conversation };
    },
  });

  initialized = true;
}
