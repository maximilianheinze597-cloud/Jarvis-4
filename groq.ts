import { listToolSpecsForModel, executeToolByName } from "@/lib/tools/registry";
import { registerBuiltinTools } from "@/lib/tools/builtin";
import { getServerEnv } from "@/lib/env";

registerBuiltinTools();

type ChatRole = "system" | "user" | "assistant" | "tool";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  name?: string;
  toolCallId?: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type GroqChoice = {
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
};

type GroqResponse = {
  choices: GroqChoice[];
  model: string;
};

export type AssistantAnswer = {
  text: string;
  model: string;
  toolEvents: Array<{ tool: string; ok: boolean; result: unknown }>;
};

const SYSTEM_PROMPT = `Du bist JARVIS, ein präziser, ruhiger, höflicher deutscher KI-Assistent.
Regeln:
- Antworte standardmäßig auf Deutsch.
- Erfinde keine Systemdaten oder Prüfungen.
- Wenn du Status/Fakten brauchst, verwende verfügbare Tools.
- Trenne klar zwischen sicheren Fakten, Schätzung und Nichtverfügbarkeit.
- Formuliere kurz, klar und professionell mit leicht trockenem Humor, wenn passend.`;

function trimConversation(messages: ChatMessage[], max = 16) {
  return messages.slice(-max);
}

async function callGroq(payload: Record<string, unknown>, apiKey: string, baseUrl: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  const linked = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: linked,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) throw new Error("Groq API-Key ist ungültig oder fehlt.");
      if (res.status === 429) throw new Error("Groq Rate-Limit erreicht. Bitte kurz warten.");
      throw new Error(`Groq-Fehler (${res.status}): ${body.slice(0, 220)}`);
    }

    return (await res.json()) as GroqResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateAssistantAnswer(input: {
  messages: ChatMessage[];
  model?: string;
  sessionId: string;
  conversationId?: string;
  allowConfirmTools?: boolean;
  signal?: AbortSignal;
}) {
  const env = getServerEnv();

  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY fehlt. Bitte Server-Konfiguration prüfen.");
  }

  const workingMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...trimConversation(input.messages),
  ];

  const tools = listToolSpecsForModel();

  const first = await callGroq(
    {
      model: input.model || env.GROQ_MODEL,
      messages: workingMessages,
      tools,
      tool_choice: "auto",
      temperature: 0.4,
      max_completion_tokens: 600,
    },
    env.GROQ_API_KEY,
    env.GROQ_API_BASE_URL,
    input.signal,
  );

  const firstChoice = first.choices[0];
  const toolEvents: AssistantAnswer["toolEvents"] = [];

  if (!firstChoice) {
    throw new Error("Keine Antwort von Groq erhalten.");
  }

  if (firstChoice.message.tool_calls?.length) {
    const toolMessages: ChatMessage[] = [];

    for (const call of firstChoice.message.tool_calls.slice(0, 3)) {
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }

      const result = await executeToolByName({
        tool: call.function.name,
        arguments: args,
        allowConfirmTools: input.allowConfirmTools,
        context: {
          sessionId: input.sessionId,
          conversationId: input.conversationId,
        },
      });

      toolEvents.push({
        tool: call.function.name,
        ok: result.ok,
        result: result.ok ? result.data : result.error,
      });

      toolMessages.push({
        role: "tool",
        content: JSON.stringify(result),
        name: call.function.name,
        toolCallId: call.id,
      });
    }

    const second = await callGroq(
      {
        model: input.model || env.GROQ_MODEL,
        messages: [
          ...workingMessages,
          {
            role: "assistant",
            content: firstChoice.message.content,
            tool_calls: firstChoice.message.tool_calls,
          },
          ...toolMessages.map((msg) => ({
            role: "tool",
            content: msg.content,
            tool_call_id: msg.toolCallId,
            name: msg.name,
          })),
        ],
        temperature: 0.4,
        max_completion_tokens: 600,
      },
      env.GROQ_API_KEY,
      env.GROQ_API_BASE_URL,
      input.signal,
    );

    const finalText = second.choices[0]?.message.content?.trim() || "Ich konnte keine finale Antwort formulieren.";
    return {
      text: finalText,
      model: second.model,
      toolEvents,
    } satisfies AssistantAnswer;
  }

  return {
    text: firstChoice.message.content?.trim() || "",
    model: first.model,
    toolEvents,
  } satisfies AssistantAnswer;
}
