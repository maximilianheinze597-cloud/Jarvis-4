# J.A.R.V.I.S. – Persönlicher KI-Assistent (Next.js + Groq + Fish Audio)

Ein vollständiger, erweiterbarer Fullstack-Assistent mit futuristischem HUD, Sprachsteuerung, Chat-Verlauf, Tool-System, Systemstatus und serverseitiger Integration für Groq (LLM) sowie Fish Audio (TTS).

## Features (implementiert)

- **Futuristisches JARVIS-HUD** (Dark/Cyan/Teal/Orange, Reactor-Core, Statusanzeigen, Responsive)
- **Push-to-Talk** via Web Speech API (Browser-abhängig)
- **Text-Chat + Konversationsverlauf** mit PostgreSQL/Drizzle-Persistenz
- **Session-basierte Nutzung** via signiertem HttpOnly-Cookie
- **Groq-Integration (serverseitig)** mit:
  - konfigurierbarem Modell
  - kontrollierter Kontextlänge
  - Tool-Calling über registrierte Tools
  - Timeout-/Rate-Limit-/Fehlerbehandlung
- **Fish Audio TTS (serverseitig)** mit:
  - konfigurierbarer Voice-ID
  - konfigurierbarem TTS-Modell
  - MIME-korrekter Audioausgabe
  - Stop/Replay im Frontend
- **Dashboard-Bereiche**:
  - Systemstatus (Backend/DB/Groq/Fish)
  - Aktivitätsprotokoll
  - Uhrzeit/Datum/Zeitzone
- **Schnellaktionen**:
  - neue Unterhaltung
  - Uhrzeit fragen
  - Systemstatus prüfen
  - Aufgabe abbrechen
- **Einstellungsmodul** (persistiert):
  - Anzeigename, Sprache, Voice-ID, Groq/Fish-Modell
  - Sprechtempo
  - Auto-Speak / Auto-Play
  - Push-to-Talk, Reduced Motion, Confirm Actions
- **Sicherheits-Basics**:
  - secrets nur serverseitig
  - Rate Limiting
  - validierte Inputs (Zod)
  - keine Secret-Ausgabe in Responses
  - Security-Headers in `next.config.ts`
- **Automatisierte Tests** für:
  - Konfigurationsvalidierung
  - Groq-Service (gemockt)
  - Fish-Service (gemockt)
  - fehlende API-Keys
  - Tool-Registry + Berechtigungen
  - Settings-Validierung
  - Audio-State-Machine
  - Frontend-Komponente

---

## Projektstruktur

```text
src/
  app/
    api/
      activity/
      chat/
      conversations/
      health/
      settings/
      status/
      tts/
    globals.css
    layout.tsx
    page.tsx
  components/jarvis/
    JarvisHUD.tsx
  db/
    index.ts
    schema.ts
  lib/
    audio-state-machine.ts
    chat-store.ts
    env.ts
    http.ts
    rate-limit.ts
    session.ts
    settings.ts
    services/
      fish.ts
      groq.ts
      status.ts
    tools/
      builtin.ts
      registry.ts
tests/
  *.test.ts(x)
.env.example
```

---

## Voraussetzungen

- Node.js 20+
- npm 10+
- PostgreSQL (lokal, z. B. `postgresql://postgres:postgres@127.0.0.1:5432/app_db`)

---

## Installation

```bash
npm install
```

---

## Konfiguration

1. `.env.example` nach `.env` kopieren
2. Werte eintragen (nur lokal/serverseitig)

Benötigte Variablen:

- `DATABASE_URL`
- `JARVIS_SESSION_SECRET`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GROQ_API_BASE_URL` (default: `https://api.groq.com/openai/v1`)
- `FISH_AUDIO_API_KEY`
- `FISH_AUDIO_VOICE_ID`
- `FISH_AUDIO_MODEL`
- `FISH_AUDIO_API_BASE_URL` (default: `https://api.fish.audio`)
- `JARVIS_APP_URL` (optional)

> Niemals echte Schlüssel in Git committen.

---

## Datenbank einrichten

Schema anwenden:

```bash
npx drizzle-kit push
```

---

## Lokaler Start

```bash
npm run dev
```

App: `http://localhost:3000`

---

## Tests

```bash
npx vitest run
```

Typecheck:

```bash
npm exec tsc -- --noEmit
```

---

## Produktions-Build

```bash
npm run build
npm run start
```

---

## Deployment-Hinweise

- Für Groq/Fish ist **ein Server-Backend erforderlich** (keine reine statische Hosting-Seite).
- Secrets ausschließlich als Server-Environment-Variablen bereitstellen.
- Reverse-Proxy/Host so konfigurieren, dass HTTPS aktiv ist.

---

## Sicherheitshinweise

- API-Keys nie im Client ausgeben
- `.env` nicht committen
- Rate-Limits aktiv
- Eingaben serverseitig validiert
- Session-ID als signiertes HttpOnly-Cookie

---

## Bekannte Einschränkungen

- Web Speech API ist browserabhängig (nicht in allen Browsern verfügbar)
- Echtes Wake-Word („Hey Jarvis“) ist **nicht** implementiert
- Audio-Streaming vom TTS-Endpunkt wird aktuell als vollständiges Audio zurückgegeben (kein chunkweises Client-Streaming)
- Manche externe Dienstprüfungen sind als **optionale Probe** (`/api/status?probe=1`) ausgelegt, um unnötige API-Last zu vermeiden

---

## Offiziell vorbereitete, aber noch nicht implementierte Module

- Kalender
- Aufgaben/Reminders
- Wetter
- Smart-Home
- Websuche
- Computersteuerung mit bestätigungspflichtigen Aktionen

Diese Integrationen werden aktuell **nicht** als aktiv dargestellt, solange sie nicht real angebunden sind.
