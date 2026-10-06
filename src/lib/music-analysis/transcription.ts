import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { z } from "zod";

export interface MusicTranscript {
  provider: string;
  model: string;
  text: string;
  segments: Array<{ startMs: number; endMs: number; text: string }>;
}

const openAiResponseSchema = z
  .object({
    text: z.string(),
    segments: z
      .array(
        z.object({
          start: z.number(),
          end: z.number(),
          text: z.string()
        })
      )
      .optional()
  })
  .passthrough();

async function transcodeForTranscription(input: {
  inputPath: string;
  outputPath: string;
  ffmpegExecutable: string;
  signal?: AbortSignal;
}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      input.ffmpegExecutable,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-i",
        input.inputPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-b:a",
        "32k",
        input.outputPath
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const abort = () => child.kill("SIGTERM");
    if (input.signal) {
      if (input.signal.aborted) abort();
      input.signal.addEventListener("abort", abort, { once: true });
    }

    child.once("error", reject);
    child.once("exit", (code) => {
      input.signal?.removeEventListener("abort", abort);
      if (input.signal?.aborted) {
        reject(new Error("Lyric transcription was cancelled."));
      } else if (code !== 0) {
        reject(
          new Error(
            "Transcription audio preparation failed: " +
              (stderr.trim() || "unknown FFmpeg error")
          )
        );
      } else {
        resolve();
      }
    });
  });
}

export async function transcribeLyricsWithOpenAI(input: {
  sourcePath: string;
  compressedPath: string;
  ffmpegExecutable: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  signal?: AbortSignal;
}): Promise<MusicTranscript> {
  await transcodeForTranscription({
    inputPath: input.sourcePath,
    outputPath: input.compressedPath,
    ffmpegExecutable: input.ffmpegExecutable,
    signal: input.signal
  });

  const bytes = await readFile(input.compressedPath);
  const body = new FormData();
  body.set(
    "file",
    new Blob([bytes], { type: "audio/mpeg" }),
    "music-analysis.mp3"
  );
  body.set("model", input.model);
  body.set("response_format", "json");

  const response = await fetch(
    new URL("/v1/audio/transcriptions", input.baseUrl),
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + input.apiKey
      },
      body,
      signal: input.signal
    }
  );

  if (!response.ok) {
    const message = (await response.text()).slice(0, 4000);
    throw new Error(
      "OpenAI lyric transcription failed (" +
        response.status +
        "): " +
        message
    );
  }

  const parsed = openAiResponseSchema.parse(await response.json());
  return {
    provider: "openai",
    model: input.model,
    text: parsed.text,
    segments:
      parsed.segments?.map((segment) => ({
        startMs: Math.max(0, Math.round(segment.start * 1000)),
        endMs: Math.max(0, Math.round(segment.end * 1000)),
        text: segment.text
      })) ?? []
  };
}
