import { createHmac, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { WORKER_HEARTBEAT_FRESHNESS_MS } from "./worker-health";

const POLL_INTERVAL_MS = 60_000;
const SEND_TIMEOUT_MS = 10_000;

export type EngineRoomTelemetryConfig = {
  url: string;
  keyId: string;
  secret: string;
};

export function readEngineRoomTelemetryConfig(
  source: Record<string, string | undefined> = process.env
): EngineRoomTelemetryConfig | null {
  const url = source.ENGINE_ROOM_TELEMETRY_URL?.trim() ?? "";
  const keyId = source.ENGINE_ROOM_TELEMETRY_KEY_ID?.trim() ?? "";
  const secret = source.ENGINE_ROOM_TELEMETRY_SECRET ?? "";
  if (!url && !keyId && !secret) return null;
  if (!url || !keyId || !secret) {
    throw new Error("Engine Room telemetry configuration is incomplete.");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Engine Room telemetry URL is invalid.");
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/api/telemetry" ||
    parsed.search ||
    parsed.hash ||
    !/^[A-Za-z0-9._-]{1,64}$/.test(keyId) ||
    Buffer.byteLength(secret, "utf8") < 32 ||
    Buffer.byteLength(secret, "utf8") > 1024
  ) {
    throw new Error("Engine Room telemetry settings fail security validation.");
  }
  return { url: parsed.toString(), keyId, secret };
}

export function signEngineRoomTelemetry(
  body: Uint8Array,
  timestamp: string,
  secret: string
): string {
  return "sha256=" +
    createHmac("sha256", secret)
      .update(timestamp + ".")
      .update(body)
      .digest("hex");
}

/**
 * One point-in-time worker heartbeat probe. This is NOT a rolling uptime SLA,
 * a complete generation test, or a claim that OpenAI/Runway are available.
 */
export function buildWorkerAvailabilityDelivery(
  checkedAt: Date,
  deliveryKey: string,
  workerObserved: boolean
) {
  if (!/^[a-f0-9-]{36}$/.test(deliveryKey)) {
    throw new Error("Delivery identity must be a UUID.");
  }
  return {
    version: 1 as const,
    deliveryId: "mvw-worker-" + deliveryKey,
    records: [{
      kind: "metric" as const,
      externalId: "mvw-worker-" + deliveryKey,
      metric: "availability-percent" as const,
      value: workerObserved ? 100 : 0,
      observedAt: checkedAt.toISOString()
    }]
  };
}

async function publish(config: EngineRoomTelemetryConfig) {
  const now = new Date();
  const workers = await db.workerHeartbeat.count({
    where: {
      lastSeenAt: {
        gte: new Date(now.getTime() - WORKER_HEARTBEAT_FRESHNESS_MS),
        lte: new Date(now.getTime() + 30_000)
      }
    }
  });
  const body = Buffer.from(
    JSON.stringify(buildWorkerAvailabilityDelivery(now, randomUUID(), workers > 0)),
    "utf8"
  );
  const timestamp = String(Date.now());
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Engine-Room-Key": config.keyId,
      "X-Engine-Room-Timestamp": timestamp,
      "X-Engine-Room-Signature": signEngineRoomTelemetry(body, timestamp, config.secret)
    },
    body,
    redirect: "error",
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error("Engine Room rejected telemetry with HTTP " + response.status);
  }
}

/** Noncritical telemetry must not crash or block video generation. */
export function startEngineRoomWorkerTelemetry(): () => Promise<void> {
  const config = readEngineRoomTelemetryConfig();
  if (!config) return async () => undefined;

  let stopping = false;
  let pending: Promise<void> | null = null;
  const tick = () => {
    if (stopping || pending) return;
    pending = publish(config)
      .catch(() => {
        // Do not log URL, response bodies, signed payloads, or secrets.
        console.error("Engine Room worker telemetry delivery failed.");
      })
      .finally(() => {
        pending = null;
      });
  };
  const timer = setInterval(tick, POLL_INTERVAL_MS);
  timer.unref();
  tick();

  return async () => {
    stopping = true;
    clearInterval(timer);
    if (pending) await pending;
  };
}
