import { z } from "zod";

const timedPointSchema = z.object({
  timeMs: z.number().int().min(0),
  value: z.number().min(0).max(1)
});

const transcriptSegmentSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  text: z.string()
});

export const musicAnalysisResultSchema = z.object({
  schemaVersion: z.literal(1),
  analyzer: z.object({
    engine: z.literal("librosa"),
    version: z.string(),
    sampleRate: z.number().int().positive(),
    hopLength: z.number().int().positive()
  }),
  durationMs: z.number().int().positive(),
  waveform: z.array(
    z.object({
      startMs: z.number().int().min(0),
      endMs: z.number().int().min(0),
      min: z.number().min(-1.5).max(1.5),
      max: z.number().min(-1.5).max(1.5),
      rms: z.number().min(0)
    })
  ),
  tempo: z.object({
    bpm: z.number().min(0),
    confidence: z.number().min(0).max(1),
    beatCount: z.number().int().min(0)
  }),
  beatsMs: z.array(z.number().int().min(0)),
  barCandidates: z.object({
    meter: z.literal("4/4"),
    phase: z.number().int().min(0).max(3),
    confidence: z.number().min(0).max(1),
    barsMs: z.array(z.number().int().min(0))
  }),
  energyCurve: z.array(timedPointSchema),
  sections: z.array(
    z.object({
      index: z.number().int().min(0),
      label: z.string(),
      startMs: z.number().int().min(0),
      endMs: z.number().int().min(0),
      meanEnergy: z.number().min(0).max(1)
    })
  ),
  structuralChanges: z.array(
    z.object({
      timeMs: z.number().int().min(0),
      score: z.number().min(0).max(1),
      kind: z.enum(["section-boundary", "novelty-peak"])
    })
  ),
  drops: z.array(
    z.object({
      timeMs: z.number().int().min(0),
      score: z.number().min(0).max(1),
      preEnergy: z.number().min(0).max(1),
      postEnergy: z.number().min(0).max(1)
    })
  ),
  introCandidate: z.object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    basis: z.string()
  }),
  outroCandidate: z.object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    basis: z.string()
  }),
  transitionCandidates: z.array(
    z.object({
      timeMs: z.number().int().min(0),
      score: z.number().min(0).max(1),
      reasons: z.array(z.string())
    })
  ),
  transcript: z
    .object({
      provider: z.string(),
      model: z.string(),
      text: z.string(),
      segments: z.array(transcriptSegmentSchema)
    })
    .nullable(),
  vocalPassages: z.array(transcriptSegmentSchema),
  instrumentalBreakCandidates: z.array(
    z.object({
      startMs: z.number().int().min(0),
      endMs: z.number().int().min(0),
      basis: z.string()
    })
  )
});

export type MusicAnalysisResult = z.infer<typeof musicAnalysisResultSchema>;

export function withTranscript(
  result: MusicAnalysisResult,
  transcript: {
    provider: string;
    model: string;
    text: string;
    segments: Array<{ startMs: number; endMs: number; text: string }>;
  } | null
): MusicAnalysisResult {
  if (!transcript) return result;

  const segments = [...transcript.segments]
    .filter((segment) => segment.endMs >= segment.startMs)
    .sort((left, right) => left.startMs - right.startMs);

  const instrumentalBreakCandidates: MusicAnalysisResult["instrumentalBreakCandidates"] = [];
  if (segments.length > 0) {
    let cursor = 0;
    for (const segment of segments) {
      if (segment.startMs - cursor >= 6000) {
        instrumentalBreakCandidates.push({
          startMs: cursor,
          endMs: segment.startMs,
          basis: "gap-between-timestamped-lyric-segments"
        });
      }
      cursor = Math.max(cursor, segment.endMs);
    }
    if (result.durationMs - cursor >= 6000) {
      instrumentalBreakCandidates.push({
        startMs: cursor,
        endMs: result.durationMs,
        basis: "gap-after-timestamped-lyric-segments"
      });
    }
  }

  return musicAnalysisResultSchema.parse({
    ...result,
    transcript: {
      ...transcript,
      segments
    },
    vocalPassages: segments,
    instrumentalBreakCandidates
  });
}
