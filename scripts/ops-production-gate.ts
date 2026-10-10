import { spawn } from "node:child_process";
import {
  evaluateProductionGate,
  type ProductionGateStage
} from "../src/lib/ops/production-gate";

const commands: Record<ProductionGateStage, string[]> = {
  "infrastructure-preflight": ["run", "production:preflight"],
  "worker-observation": ["run", "ops:health", "--", "--json", "--fail-unhealthy"],
  "asset-integrity": ["run", "ops:asset-integrity", "--", "--json"]
};

async function run(stage: ProductionGateStage): Promise<boolean> {
  return new Promise(resolve => {
    let resolved = false;
    const child = spawn("npm", commands[stage], {
      env: process.env,
      stdio: ["ignore", "ignore", "ignore"]
    });
    const finish = (passed: boolean) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve(passed);
    };
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(false);
    }, 10 * 60 * 1000);
    timeout.unref();
    child.once("error", () => finish(false));
    child.once("close", code => finish(code === 0));
  });
}

async function main() {
  if (process.env.NODE_ENV !== "production") {
    console.error("Production gate requires NODE_ENV=production.");
    process.exitCode = 2;
    return;
  }
  const checkedAt = new Date().toISOString();
  const outcome = await evaluateProductionGate(run);
  const report = {
    checkedAt,
    scope: "infrastructure-worker-and-storage-only",
    passed: outcome.passed,
    checks: outcome.checks,
    paidProviderVideoAcceptance: "not-performed",
    recoveryDrill: "not-performed"
  };
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  if (!outcome.passed) process.exitCode = 2;
}

main().catch(() => {
  console.error("Production gate could not complete.");
  process.exitCode = 1;
});
