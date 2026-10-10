import { describe, expect, it } from "vitest";
import {
  classifyWorkerObservation,
  WORKER_HEARTBEAT_INTERVAL_MS,
  WORKER_HEARTBEAT_FRESHNESS_MS
} from "./worker-health";

describe("worker observation", () => {
  it("never claims a worker is active when no recent heartbeat exists", () => {
    expect(classifyWorkerObservation(0, 0)).toBe("worker-unverified");
  });
  it("reports a recent heartbeat without claiming full end-to-end readiness", () => {
    expect(classifyWorkerObservation(1, 0)).toBe("heartbeat-active");
  });
  it("flags stale running work even when a worker has a recent heartbeat", () => {
    expect(classifyWorkerObservation(2, 1)).toBe("degraded");
    expect(classifyWorkerObservation(0, 1)).toBe("degraded");
  });
  it("rejects negative, fractional, and invalid counters", () => {
    expect(() => classifyWorkerObservation(-1, 0)).toThrow();
    expect(() => classifyWorkerObservation(1, 0.2)).toThrow();
    expect(() => classifyWorkerObservation(Number.NaN, 0)).toThrow();
  });
  it("uses bounded monitoring windows", () => {
    expect(WORKER_HEARTBEAT_INTERVAL_MS).toBe(30_000);
    expect(WORKER_HEARTBEAT_FRESHNESS_MS).toBeGreaterThan(WORKER_HEARTBEAT_INTERVAL_MS);
  });
});
