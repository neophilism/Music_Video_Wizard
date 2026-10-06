export function normalizeProgress(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Progress must be a finite number.");
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}
