"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type AssistantState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING" | "EXECUTING" | "ERROR" | "DISCONNECTED";

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
};

type ActivityLog = {
  id: string;
  eventType: string;
  message: string;
  level: string;
  createdAt: string;
};

type ServicesStatus = {
  backend: string;
  database: string;
  groq: string;
  fishAudio: string;
  checkedAt: string;
  details: Record<string, string>;
};

type Settings = {
  displayName: string;
  language: string;
  voiceId: string;
  groqModel: string;
  fishModel: string;
  speechRate: number;
  autoSpeak: boolean;
  pushToTalk: boolean;
  handsFreeMode: boolean;
  persistHistory: boolean;
  autoPlayAudio: boolean;
  reducedMotion: boolean;
  accentColor: "cyan" | "teal" | "orange";
  confirmActions: boolean;
  integrations: Record<string, boolean>;
};

const initialSettings: Settings = {
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

export function JarvisHUD() {
  const [state, setState] = useState<AssistantState>("IDLE");
  const [clock, setClock] = useState(new Date());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [transcript, setTranscript] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [status, setStatus] = useState<ServicesStatus | null>(null);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrl = useRef<string | null>(null);

  const canUseSpeech = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onOnline = () => setState((s) => (s === "DISCONNECTED" ? "IDLE" : s));
    const onOffline = () => setState("DISCONNECTED");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setState("DISCONNECTED");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function boot() {
    await Promise.all([loadSettings(), loadConversations(), loadActivity(), loadStatus(false)]);
  }

  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const json = await res.json();
    if (json.settings) setSettings(json.settings);
  }

  async function saveSettings(next: Settings) {
    setSettings(next);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    if (!res.ok) {
      setError("Einstellungen konnten nicht gespeichert werden.");
      return;
    }

    setError(null);
  }

  async function loadConversations() {
    const res = await fetch("/api/conversations", { cache: "no-store" });
    const json = await res.json();
    const list = (json.conversations as Conversation[]) ?? [];
    setConversations(list);

    if (list.length && !activeConversationId) {
      await openConversation(list[0].id);
    }
  }

  async function openConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setActiveConversationId(id);
    setMessages(json.messages ?? []);
  }

  async function newConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Neue Unterhaltung" }),
    });

    const json = await res.json();
    if (json.conversation?.id) {
      setConversations((prev) => [json.conversation, ...prev]);
      setActiveConversationId(json.conversation.id);
      setMessages([]);
    }
  }

  async function deleteActiveConversation() {
    if (!activeConversationId) return;

    await fetch(`/api/conversations/${activeConversationId}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== activeConversationId));
    setMessages([]);
    setActiveConversationId(null);
    await loadConversations();
  }

  async function loadActivity() {
    const res = await fetch("/api/activity", { cache: "no-store" });
    const json = await res.json();
    setActivity(json.logs ?? []);
  }

  async function loadStatus(probe: boolean) {
    const res = await fetch(`/api/status?probe=${probe ? "1" : "0"}`, { cache: "no-store" });
    const json = await res.json();
    setStatus(json);
  }

  function animateAssistantText(full: string) {
    setStreamingText("");
    const tokens = full.split(/(\s+)/);
    let i = 0;

    const tick = () => {
      i += 1;
      setStreamingText(tokens.slice(0, i).join(""));
      if (i < tokens.length) {
        window.setTimeout(tick, settings.reducedMotion ? 0 : 26);
      }
    };

    tick();
  }

  async function speak(text: string) {
    stopSpeech();

    try {
      setState("SPEAKING");
      setIsSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: settings.voiceId || undefined,
          speed: settings.speechRate,
          language: settings.language,
          conversationId: activeConversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Audio konnte nicht erzeugt werden.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      currentAudioUrl.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        setState("IDLE");
      };
      await audio.play();
    } catch (e) {
      setIsSpeaking(false);
      setState("ERROR");
      setError(e instanceof Error ? e.message : "Audiofehler");
    }
  }

  function stopSpeech() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (currentAudioUrl.current) {
      URL.revokeObjectURL(currentAudioUrl.current);
      currentAudioUrl.current = null;
    }
    setIsSpeaking(false);
    if (state === "SPEAKING") setState("IDLE");
  }

  async function sendMessage(text?: string, regenerate = false) {
    const finalText = (text ?? draft).trim();
    if (!finalText || isLoading) return;

    setIsLoading(true);
    setError(null);
    setState("THINKING");

    if (!regenerate) {
      const optimistic: Message = {
        id: `local-${Date.now()}`,
        conversationId: activeConversationId ?? "",
        role: "user",
        content: finalText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setDraft("");
      setTranscript("");
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalText,
          conversationId: activeConversationId ?? undefined,
          regenerate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Fehler bei der KI-Anfrage.");
      }

      if (json.conversationId && !activeConversationId) {
        setActiveConversationId(json.conversationId);
      }

      animateAssistantText(json.text || "");

      setMessages((prev) => [
        ...prev.filter((m) => !m.id.startsWith("local-")),
        json.message,
      ]);

      setTimeout(() => setStreamingText(""), 1000);

      if (settings.autoSpeak && settings.autoPlayAudio && json.text) {
        void speak(json.text);
      } else {
        setState("IDLE");
      }

      await Promise.all([loadConversations(), loadActivity()]);
    } catch (e) {
      setState("ERROR");
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
    }
  }

  function startListening() {
    if (!canUseSpeech) {
      setError("Dieser Browser unterstützt keine Web Speech API.");
      return;
    }

    if (isLoading || isSpeaking) return;

    const Api = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Api) return;

    const recognition = new Api();
    recognition.lang = settings.language;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setState("LISTENING");
      setError(null);
      setTranscript("");
    };

    recognition.onresult = (event) => {
      let combined = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        combined += event.results[i]?.[0]?.transcript ?? "";
      }
      setTranscript(combined.trim());
      setDraft(combined.trim());
    };

    recognition.onerror = (event) => {
      setError(`Mikrofon/Spracherkennung: ${event.error}`);
      setState("ERROR");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (state === "LISTENING") setState("IDLE");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
    if (state === "LISTENING") setState("IDLE");
  }

  function cancelCurrentTask() {
    stopListening();
    stopSpeech();
    setIsLoading(false);
    setStreamingText("");
    setState("IDLE");
  }

  const statusPills = useMemo(
    () => [
      { label: "MIC", value: isListening ? "ON" : "OFF" },
      { label: "KI", value: isLoading ? "BUSY" : "READY" },
      { label: "NET", value: navigator.onLine ? "ONLINE" : "OFFLINE" },
      { label: "VOICE", value: isSpeaking ? "PLAY" : "IDLE" },
    ],
    [isListening, isLoading, isSpeaking],
  );

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await sendMessage();
  }

  return (
    <main className={`jarvis-shell accent-${settings.accentColor}`}>
      <aside className="jarvis-sidebar">
        <h2>J.A.R.V.I.S Modules</h2>
        <button onClick={() => void newConversation()}>Neue Unterhaltung</button>
        <button onClick={() => void loadStatus(true)}>Systemdienste prüfen</button>
        <button onClick={() => void sendMessage("Wie spät ist es aktuell?")}>Uhrzeit nennen</button>
        <button onClick={() => setShowSettings((v) => !v)}>Einstellungen</button>
        <button onClick={cancelCurrentTask}>Aktuelle Aufgabe abbrechen</button>

        <div className="side-list">
          {conversations.map((c) => (
            <button key={c.id} className={c.id === activeConversationId ? "active" : ""} onClick={() => void openConversation(c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      </aside>

      <section className="jarvis-main">
        <header className="jarvis-topbar">
          <div>
            <p className="sub">Local Time</p>
            <strong>{clock.toLocaleTimeString("de-DE")}</strong>
            <span>{clock.toLocaleDateString("de-DE")} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
          <div className="state-label">STATE: {state}</div>
        </header>

        <section className={`reactor state-${state.toLowerCase()}`} aria-label="JARVIS Reaktorkern">
          <div className="ring ring-a" />
          <div className="ring ring-b" />
          <div className="ring ring-c" />
          <div className="core" />
        </section>

        <div className="status-row">
          {statusPills.map((pill) => (
            <div key={pill.label} className="status-pill">
              <span>{pill.label}</span>
              <strong>{pill.value}</strong>
            </div>
          ))}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <label htmlFor="jarvisInput">Transkript / Textbefehl</label>
          <textarea
            id="jarvisInput"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Sprich oder tippe deinen Befehl..."
          />
          <div className="composer-actions">
            <button type="button" onClick={isListening ? stopListening : startListening}>
              {isListening ? "Aufnahme beenden" : "Push-to-Talk"}
            </button>
            <button type="submit" disabled={isLoading || !draft.trim()}>
              {isLoading ? "Analysiere..." : "Senden"}
            </button>
            <button type="button" onClick={() => void sendMessage(lastAssistant?.content || "", true)} disabled={!lastAssistant || isLoading}>
              Antwort regenerieren
            </button>
            <button type="button" onClick={stopSpeech} disabled={!isSpeaking}>
              Audio stoppen
            </button>
          </div>
        </form>

        <section className="response-box">
          <h3>Live-Antwort</h3>
          <p>{streamingText || lastAssistant?.content || "Warte auf Anfrage..."}</p>
          {lastAssistant && (
            <div className="response-actions">
              <button onClick={() => navigator.clipboard.writeText(lastAssistant.content)}>Kopieren</button>
              <button onClick={() => void speak(lastAssistant.content)}>Erneut vorlesen</button>
            </div>
          )}
        </section>

        <section className="chat-log">
          <h3>Gesprächsverlauf</h3>
          <div>
            {messages.map((m) => (
              <article key={m.id} className={`msg role-${m.role}`}>
                <header>
                  <strong>{m.role}</strong>
                  <span>{new Date(m.createdAt).toLocaleTimeString("de-DE")}</span>
                </header>
                <p>{m.content}</p>
              </article>
            ))}
          </div>
          <button onClick={deleteActiveConversation}>Aktuelle Unterhaltung löschen</button>
        </section>
      </section>

      <aside className="jarvis-panel">
        <section>
          <h3>Systemstatus</h3>
          <ul>
            <li>Backend: {status?.backend ?? "unbekannt"}</li>
            <li>Datenbank: {status?.database ?? "unbekannt"}</li>
            <li>Groq: {status?.groq ?? "unbekannt"}</li>
            <li>Fish Audio: {status?.fishAudio ?? "unbekannt"}</li>
          </ul>
        </section>

        <section>
          <h3>Aktivität</h3>
          <div className="activity-list">
            {activity.map((log) => (
              <p key={log.id}>
                <strong>{new Date(log.createdAt).toLocaleTimeString("de-DE")}</strong> · {log.message}
              </p>
            ))}
          </div>
        </section>

        {showSettings && (
          <section className="settings-panel">
            <h3>Einstellungen</h3>
            <label>
              Anzeigename
              <input value={settings.displayName} onChange={(e) => setSettings((s) => ({ ...s, displayName: e.target.value }))} />
            </label>
            <label>
              Sprache
              <input value={settings.language} onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))} />
            </label>
            <label>
              Voice-ID
              <input value={settings.voiceId} onChange={(e) => setSettings((s) => ({ ...s, voiceId: e.target.value }))} />
            </label>
            <label>
              Groq-Modell
              <input value={settings.groqModel} onChange={(e) => setSettings((s) => ({ ...s, groqModel: e.target.value }))} />
            </label>
            <label>
              Fish-Modell
              <input value={settings.fishModel} onChange={(e) => setSettings((s) => ({ ...s, fishModel: e.target.value }))} />
            </label>
            <label>
              Sprechtempo
              <input
                type="range"
                min={0.7}
                max={1.4}
                step={0.1}
                value={settings.speechRate}
                onChange={(e) => setSettings((s) => ({ ...s, speechRate: Number(e.target.value) }))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.autoSpeak}
                onChange={(e) => setSettings((s) => ({ ...s, autoSpeak: e.target.checked }))}
              />
              Automatische Sprachausgabe
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => setSettings((s) => ({ ...s, reducedMotion: e.target.checked }))}
              />
              Animationen reduzieren
            </label>

            <button onClick={() => void saveSettings(settings)}>Speichern</button>
          </section>
        )}

        {error && <p className="error-box">{error}</p>}
        {transcript && <p className="transcript-box">Live-Transkript: {transcript}</p>}
      </aside>
    </main>
  );
}
