import { describe, expect, test } from "vitest";
import { nextAudioPhase } from "@/lib/audio-state-machine";

describe("audio state machine", () => {
  test("idle -> listening -> transcribing -> thinking", () => {
    const a = nextAudioPhase("idle", "START_LISTEN");
    const b = nextAudioPhase(a, "STOP_LISTEN");
    const c = nextAudioPhase(b, "TRANSCRIPT_READY");

    expect(a).toBe("listening");
    expect(b).toBe("transcribing");
    expect(c).toBe("thinking");
  });

  test("error resets to idle", () => {
    const err = nextAudioPhase("thinking", "FAIL");
    const reset = nextAudioPhase(err, "RESET");
    expect(err).toBe("error");
    expect(reset).toBe("idle");
  });
});
