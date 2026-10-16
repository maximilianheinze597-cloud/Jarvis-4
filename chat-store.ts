import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, conversations, messages } from "@/db/schema";

export async function createConversation(sessionId: string, title = "Neue Unterhaltung") {
  const [conversation] = await db
    .insert(conversations)
    .values({ sessionId, title })
    .returning();

  return conversation;
}

export async function listConversations(sessionId: string) {
  return db.query.conversations.findMany({
    where: eq(conversations.sessionId, sessionId),
    orderBy: desc(conversations.updatedAt),
  });
}

export async function getConversationWithMessages(sessionId: string, conversationId: string) {
  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.sessionId, sessionId), eq(conversations.id, conversationId)),
  });

  if (!conversation) return null;

  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: asc(messages.createdAt),
  });

  return { conversation, messages: history };
}

export async function deleteConversation(sessionId: string, conversationId: string) {
  const existing = await db.query.conversations.findFirst({
    where: and(eq(conversations.sessionId, sessionId), eq(conversations.id, conversationId)),
  });

  if (!existing) return false;

  await db.delete(conversations).where(and(eq(conversations.sessionId, sessionId), eq(conversations.id, conversationId)));
  return true;
}

export async function appendMessage(input: {
  conversationId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  metadata?: unknown;
}) {
  const [created] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      toolName: input.toolName,
      metadata: input.metadata,
    })
    .returning();

  await db
    .update(conversations)
    .set({
      updatedAt: new Date(),
      lastMessageAt: new Date(),
    })
    .where(eq(conversations.id, input.conversationId));

  return created;
}

export async function logActivity(input: {
  sessionId: string;
  eventType: string;
  message: string;
  level?: "info" | "warn" | "error";
  conversationId?: string;
  details?: unknown;
}) {
  await db.insert(activityLogs).values({
    sessionId: input.sessionId,
    eventType: input.eventType,
    message: input.message,
    level: input.level ?? "info",
    conversationId: input.conversationId,
    details: input.details,
  });
}

export async function listRecentActivity(sessionId: string, limit = 20) {
  return db.query.activityLogs.findMany({
    where: eq(activityLogs.sessionId, sessionId),
    orderBy: desc(activityLogs.createdAt),
    limit,
  });
}
