import { getEnvironment } from "@/lib/env";

let wakeInFlight: Promise<void> | null = null;

async function performWake(): Promise<void> {
  const env = getEnvironment();
  if (!env.JOB_EXECUTOR_URL || !env.JOB_DRAIN_SECRET) return;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Executor wake timed out.")),
    env.JOB_WAKE_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      env.JOB_EXECUTOR_URL.replace(/\/$/, "") + "/api/internal/jobs/drain",
      {
        method: "POST",
        headers: {
          "x-job-drain-secret": env.JOB_DRAIN_SECRET
        },
        signal: controller.signal,
        cache: "no-store"
      }
    );

    if (!response.ok) {
      console.warn(
        "Generation executor wake returned HTTP " + response.status + "."
      );
    }
  } catch (error) {
    console.warn("Generation executor wake failed; scheduled fallback remains active.", error);
  } finally {
    clearTimeout(timeout);
  }
}

export function requestGenerationExecutorWake(): void {
  if (wakeInFlight) return;

  wakeInFlight = performWake().finally(() => {
    wakeInFlight = null;
  });
}
