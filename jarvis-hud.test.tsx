import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { JarvisHUD } from "@/components/jarvis/JarvisHUD";

beforeEach(() => {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/api/settings")) {
      return Promise.resolve(
        new Response(JSON.stringify({ settings: { displayName: "Commander", language: "de-DE", voiceId: "", groqModel: "llama-3.3-70b-versatile", fishModel: "s2.1-pro", speechRate: 1, autoSpeak: true, pushToTalk: true, handsFreeMode: false, persistHistory: true, autoPlayAudio: true, reducedMotion: false, accentColor: "cyan", confirmActions: true, integrations: { calendar: false, reminders: false, tasks: false, weather: false, webSearch: false, smartHome: false } } }), { status: 200 }),
      );
    }

    if (url.includes("/api/conversations")) {
      return Promise.resolve(new Response(JSON.stringify({ conversations: [] }), { status: 200 }));
    }

    if (url.includes("/api/activity")) {
      return Promise.resolve(new Response(JSON.stringify({ logs: [] }), { status: 200 }));
    }

    if (url.includes("/api/status")) {
      return Promise.resolve(new Response(JSON.stringify({ backend: "online", database: "online", groq: "unknown", fishAudio: "unknown", checkedAt: new Date().toISOString(), details: {} }), { status: 200 }));
    }

    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;

  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
});

describe("JarvisHUD component", () => {
  test("renders main controls", async () => {
    render(createElement(JarvisHUD));

    expect(screen.getByText(/J.A.R.V.I.S Modules/i)).toBeInTheDocument();
    expect(screen.getByText(/Push-to-Talk/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Systemstatus/i)).toBeInTheDocument();
    });
  });
});
