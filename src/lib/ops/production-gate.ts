/** A conservative zero-cost operational gate, not complete live-provider acceptance. */
export const productionGateStages = [
  "infrastructure-preflight",
  "worker-observation",
  "asset-integrity"
] as const;

export type ProductionGateStage = typeof productionGateStages[number];
export type ProductionGateCheck = { stage: ProductionGateStage; passed: boolean };

export async function evaluateProductionGate(
  run: (stage: ProductionGateStage) => Promise<boolean>
): Promise<{ passed: boolean; checks: ProductionGateCheck[] }> {
  const checks: ProductionGateCheck[] = [];
  for (const stage of productionGateStages) {
    const passed = await run(stage);
    checks.push({ stage, passed });
    if (!passed) return { passed: false, checks };
  }
  return { passed: true, checks };
}
