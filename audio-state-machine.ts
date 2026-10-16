export type AudioPhase =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "executing"
  | "error";

export type AudioEvent =
  | "START_LISTEN"
  | "STOP_LISTEN"
  | "TRANSCRIPT_READY"
  | "REQUEST_START"
  | "REQUEST_DONE"
  | "SPEAK_START"
  | "SPEAK_END"
  | "TOOL_START"
  | "TOOL_DONE"
  | "FAIL"
  | "RESET";

const transitions: Record<AudioPhase, Partial<Record<AudioEvent, AudioPhase>>> = {
  idle: {
    START_LISTEN: "listening",
    REQUEST_START: "thinking",
  },
  listening: {
    STOP_LISTEN: "transcribing",
    FAIL: "error",
  },
  transcribing: {
    TRANSCRIPT_READY: "thinking",
    RESET: "idle",
    FAIL: "error",
  },
  thinking: {
    REQUEST_DONE: "idle",
    TOOL_START: "executing",
    SPEAK_START: "speaking",
    FAIL: "error",
  },
  speaking: {
    SPEAK_END: "idle",
    FAIL: "error",
    RESET: "idle",
  },
  executing: {
    TOOL_DONE: "thinking",
    FAIL: "error",
  },
  error: {
    RESET: "idle",
  },
};

export function nextAudioPhase(current: AudioPhase, event: AudioEvent): AudioPhase {
  return transitions[current][event] ?? current;
}
