import { timingSafeEqual } from "node:crypto";
import { getEnvironment } from "@/lib/env";
import { drainGenerationQueueBatch } from "@/lib/jobs/worker";
import { registerAllGenerationHandlers } from "@/lib/jobs/register-all";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request, expected: string): boolean {
  const provided = request.headers.get("x-job-drain-secret");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const env = getEnvironment();
  if (!env.JOB_DRAIN_SECRET) {
    return Response.json(
      { error: "Bounded job draining is not configured." },
      { status: 503 }
    );
  }
  if (!authorized(request, env.JOB_DRAIN_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  registerAllGenerationHandlers();
  const result = await drainGenerationQueueBatch(env.JOB_DRAIN_BATCH_SIZE);
  return Response.json({ ok: true, ...result });
}
