import { describe, expect, it } from "vitest";
import { detectAudioContainer, validateAudioBytes } from "./audio-upload";

describe("audio upload validation", () => {
  it("detects WAV by file signature rather than filename", () => {
    const bytes = new Uint8Array([
      82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69
    ]);
    expect(detectAudioContainer(bytes)).toBe("wav");
  });

  it("rejects arbitrary non-audio bytes", () => {
    expect(() =>
      validateAudioBytes(new TextEncoder().encode("not an audio file"), 1024)
    ).toThrow(/Unsupported audio file/);
  });

  it("enforces the configured upload limit", () => {
    const bytes = new Uint8Array([73, 68, 51, 0, 0, 0]);
    expect(() => validateAudioBytes(bytes, 2)).toThrow(/maximum upload size/);
  });
});
