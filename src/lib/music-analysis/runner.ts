import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { musicAnalysisResultSchema, type MusicAnalysisResult } from "./result";

export interface MusicAnalysisRunnerOptions {
  pythonExecutable: string;
  ffmpegExecutable: string;
  outputPath: string;
  signal?: AbortSignal;
}

export async function runLibrosaMusicAnalysis(
  inputPath: string,
  options: MusicAnalysisRunnerOptions
): Promise<MusicAnalysisResult> {
  const scriptPath = path.resolve(
    process.cwd(),
    "analysis",
    "music_analysis.py"
  );

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      options.pythonExecutable,
      [
        scriptPath,
        "--input",
        inputPath,
        "--output",
        options.outputPath,
        "--ffmpeg",
        options.ffmpegExecutable
      ],
      {
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 64_000) {
        stderr = stderr.slice(-64_000);
      }
    });

    const abort = () => {
      child.kill("SIGTERM");
    };
    if (options.signal) {
      if (options.signal.aborted) abort();
      options.signal.addEventListener("abort", abort, { once: true });
    }

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      options.signal?.removeEventListener("abort", abort);
      if (options.signal?.aborted) {
        reject(new Error("Music analysis was cancelled."));
        return;
      }
      if (code !== 0) {
        reject(
          new Error(
            "Music analysis process failed" +
              (signal ? " (" + signal + ")" : "") +
              ": " +
              (stderr.trim() || "unknown error")
          )
        );
        return;
      }
      resolve();
    });
  });

  const parsed = JSON.parse(
    await readFile(options.outputPath, "utf8")
  ) as unknown;
  return musicAnalysisResultSchema.parse(parsed);
}
