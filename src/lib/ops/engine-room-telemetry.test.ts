import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildWorkerAvailabilityDelivery,
  readEngineRoomTelemetryConfig,
  signEngineRoomTelemetry
} from "./engine-room-telemetry";

const valid = {
  ENGINE_ROOM_TELEMETRY_URL: "https://engine-room.example.com/api/telemetry",
  ENGINE_ROOM_TELEMETRY_KEY_ID: "mvw-worker-prod",
  ENGINE_ROOM_TELEMETRY_SECRET: "01234567890123456789012345678901"
};

describe("Engine Room worker telemetry", () => {
  it("is disabled only when no telemetry settings were supplied", () => {
    expect(readEngineRoomTelemetryConfig({})).toBeNull();
    expect(readEngineRoomTelemetryConfig(valid)?.keyId).toBe("mvw-worker-prod");
    expect(() => readEngineRoomTelemetryConfig({ ENGINE_ROOM_TELEMETRY_KEY_ID: "partial" })).toThrow();
  });
  it("rejects insecure endpoints and short secrets", () => {
    expect(() => readEngineRoomTelemetryConfig({ ...valid, ENGINE_ROOM_TELEMETRY_URL: "http://bad.example.com/api/telemetry" })).toThrow();
    expect(() => readEngineRoomTelemetryConfig({ ...valid, ENGINE_ROOM_TELEMETRY_URL: "https://good.example.com/api/other" })).toThrow();
    expect(() => readEngineRoomTelemetryConfig({ ...valid, ENGINE_ROOM_TELEMETRY_URL: "https://good.example.com/api/telemetry?secret=a" })).toThrow();
    expect(() => readEngineRoomTelemetryConfig({ ...valid, ENGINE_ROOM_TELEMETRY_SECRET: "short" })).toThrow();
  });
  it("signs exactly timestamp dot raw bytes with HMAC SHA-256", () => {
    const data = Buffer.from('{"version":1}', "utf8");
    const timestamp = "1791590400000";
    const signature = signEngineRoomTelemetry(data, timestamp, valid.ENGINE_ROOM_TELEMETRY_SECRET);
    const expected = createHmac("sha256", valid.ENGINE_ROOM_TELEMETRY_SECRET)
      .update(timestamp + ".").update(data).digest("hex");
    expect(signature).toBe("sha256=" + expected);
  });
  it("sends only scoped aggregate point-in-time heartbeat evidence", () => {
    const observedAt = new Date("2026-10-10T00:00:00.000Z");
    const id = "00000000-0000-4000-8000-000000000001";
    const success = buildWorkerAvailabilityDelivery(observedAt, id, true);
    expect(success.version).toBe(1);
    expect(success.records).toEqual([{
      kind: "metric",
      externalId: "mvw-worker-" + id,
      metric: "worker-heartbeat-percent",
      value: 100,
      observedAt: observedAt.toISOString()
    }]);
    expect(buildWorkerAvailabilityDelivery(observedAt, id, false).records[0]!.value).toBe(0);
    expect(() => buildWorkerAvailabilityDelivery(observedAt, "not-uuid", true)).toThrow();
  });
});
