import { describe, expect, it } from "vitest";
import { evaluateProductionGate, productionGateStages } from "./production-gate";

describe("zero-cost production gate", () => {
  it("runs infrastructure, worker, and asset checks in order", async () => {
    const called: string[] = [];
    const result = await evaluateProductionGate(async stage => {
      called.push(stage);
      return true;
    });
    expect(result.passed).toBe(true);
    expect(called).toEqual([...productionGateStages]);
  });
  it("does not claim success or continue after an earlier failed step", async () => {
    const called: string[] = [];
    const result = await evaluateProductionGate(async stage => {
      called.push(stage);
      return stage !== "worker-observation";
    });
    expect(result.passed).toBe(false);
    expect(called).toEqual(["infrastructure-preflight", "worker-observation"]);
    expect(result.checks[1]!.passed).toBe(false);
  });
  it("does not swallow a failed dependency invocation", async () => {
    await expect(evaluateProductionGate(async () => {
      throw new Error("not configured");
    })).rejects.toThrow("not configured");
  });
});
