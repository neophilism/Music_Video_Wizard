import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { GenerationJob } from "@prisma/client";
import { AssetStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import {
  PermanentGenerationError,
  type GenerationHandlerContext
} from "@/lib/jobs/registry";
import { createAssetStorage } from "@/lib/storage";
import {
  persistMusicAnalysisResult,
  queuedMusicAnalysisRequestSchema
} from "./service";
import { runLibrosaMusicAnalysis } from "./runner";
import { transcribeLyricsWithOpenAI } from "./transcription";
import { withTranscript, type MusicAnalysisResult } from "./result";

function permanentIfRuntimeOrInput(error: unknown): never {
  if (
    error instanceof Error &&
    (
      error.message.includes("ENOENT") ||
      error.message.includes("FFmpeg audio decode failed") ||
      error.message.includes("Decoded audio contains no samples")
    )
  ) {
    throw new PermanentGenerationError(error.message);
  }
  throw error;
}

export async function handleLocalMusicAnalysis(
  job: GenerationJob,
  context: GenerationHandlerContext
) {
  const env = getEnvironment();
  const request = queuedMusicAnalysisRequestSchema.parse(job.requestSnapshot);

  const audio = await db.assetVersion.findFirst({
    where: {
      id: request.audioAssetVersionId,
      status: AssetStatus.READY,
      asset: {
        projectId: request.projectId,
        workspaceId: job.workspaceId
      }
    },
    select: {
      storageKey: true
    }
  });
  if (!audio) {
    throw new PermanentGenerationError(
      "Master audio for this music-analysis job is no longer available."
    );
  }

  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "music-video-analysis-")
  );
  const inputPath = path.join(
    tempDir,
    "master" + (path.extname(audio.storageKey) || ".audio")
  );
  const resultPath = path.join(tempDir, "analysis.json");
  const transcriptionPath = path.join(tempDir, "transcription.mp3");

  try {
    await context.reportProgress(5, "Reading immutable master audio.");
    await createAssetStorage(env).downloadToFile(
      audio.storageKey,
      inputPath
    );

    await context.reportProgress(
      15,
      "Analyzing waveform, rhythm, energy, and structure."
    );

    let result: MusicAnalysisResult;
    try {
      result = await runLibrosaMusicAnalysis(inputPath, {
        pythonExecutable: env.AUDIO_ANALYSIS_PYTHON,
        ffmpegExecutable: env.AUDIO_ANALYSIS_FFMPEG,
        outputPath: resultPath,
        signal: context.signal
      });
    } catch (error) {
      permanentIfRuntimeOrInput(error);
    }

    await context.reportProgress(75, "Core music analysis complete.", {
      durationMs: result.durationMs,
      bpm: result.tempo.bpm,
      beats: result.tempo.beatCount,
      sections: result.sections.length
    });

    if (request.includeLyrics) {
      if (
        request.transcriptionProvider !== "openai" ||
        !env.OPENAI_API_KEY ||
        !request.transcriptionModel
      ) {
        throw new PermanentGenerationError(
          "Requested lyric transcription is not configured."
        );
      }

      await context.reportProgress(80, "Transcribing lyrics.");
      const transcript = await transcribeLyricsWithOpenAI({
        sourcePath: inputPath,
        compressedPath: transcriptionPath,
        ffmpegExecutable: env.AUDIO_ANALYSIS_FFMPEG,
        apiKey: env.OPENAI_API_KEY,
        model: request.transcriptionModel,
        baseUrl: env.OPENAI_BASE_URL,
        signal: context.signal
      });
      result = withTranscript(result, transcript);
    }

    await context.reportProgress(92, "Persisting immutable analysis version.");
    const persisted = await persistMusicAnalysisResult({
      generationJobId: job.id,
      request,
      result,
      requestedByUserId: job.requestedByUserId
    });

    return {
      ...persisted,
      durationMs: result.durationMs,
      bpm: result.tempo.bpm,
      beatCount: result.tempo.beatCount,
      sectionCount: result.sections.length,
      dropCount: result.drops.length,
      transcriptAvailable: Boolean(result.transcript?.text)
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
