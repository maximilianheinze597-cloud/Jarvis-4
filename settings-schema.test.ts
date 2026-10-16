import { describe, expect, test } from "vitest";
import { settingsSchema, defaultSettings } from "@/lib/settings";

describe("settings schema", () => {
  test("default settings are valid", () => {
    expect(settingsSchema.safeParse(defaultSettings).success).toBe(true);
  });

  test("rejects invalid speechRate", () => {
    const result = settingsSchema.safeParse({ ...defaultSettings, speechRate: 9 });
    expect(result.success).toBe(false);
  });
});
