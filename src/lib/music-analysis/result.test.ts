import { describe, expect, it } from "vitest";
import {
  musicAnalysisResultSchema,
  withTranscript
} from "./result";

const base = musicAnalysisResultSchema.parse({
  schemaVersion: 1,
  analyzer: {
    engine: "librosa",
    version: "1.0.0",
    sampleRate: 22050,
    hopLength: 512
  },
  durationMs: 30000,
  waveform: [],
  tempo: {
    bpm: 120,
    confidence: 0.8,
    beatCount: 60
  },
  beatsMs: [],
  barCandidates: {
    meter: "4/4",
    phase: 0,
    confidence: 0.5,
    barsMs: []
  },
  energyCurve: [],
  sections: [],
  structuralChanges: [],
  drops: [],
  introCandidate: {
    startMs: 0,
    endMs: 4000,
    basis: "first-estimated-section"
  },
  outroCandidate: {
    startMs: 26000,
    endMs: 30000,
    basis: "last-estimated-section"
  },
  transitionCandidates: [],
  transcript: null,
  vocalPassages: [],
  instrumentalBreakCandidates: []
});

describe("music analysis result", () => {
  it("derives vocal passages and real transcript gaps only from timestamps", () => {
    const result = withTranscript(base, {
      provider: "test",
      model: "test-model",
      text: "one two",
      segments: [
        { startMs: 7000, endMs: 11000, text: "one" },
        { startMs: 19000, endMs: 23000, text: "two" }
      ]
    });

    expect(result.vocalPassages).toHaveLength(2);
    expect(result.instrumentalBreakCandidates).toEqual([
      {
        startMs: 0,
        endMs: 7000,
        basis: "gap-between-timestamped-lyric-segments"
      },
      {
        startMs: 11000,
        endMs: 19000,
        basis: "gap-between-timestamped-lyric-segments"
      },
      {
        startMs: 23000,
        endMs: 30000,
        basis: "gap-after-timestamped-lyric-segments"
      }
    ]);
  });

  it("does not invent vocal timing from transcript text alone", () => {
    const result = withTranscript(base, {
      provider: "test",
      model: "test-model",
      text: "lyrics without timing",
      segments: []
    });

    expect(result.transcript?.text).toBe("lyrics without timing");
    expect(result.vocalPassages).toEqual([]);
    expect(result.instrumentalBreakCandidates).toEqual([]);
  });
});
