export function roundMeasurement(value: number): number;
export function roundMeasurement(value: number | null): number | null;
export function roundMeasurement(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return value;
  const scaled = Math.abs(value) * 100;
  if (scaled >= Number.MAX_SAFE_INTEGER) return value;
  // Allow for floating-point error at decimal ties. Match migration 0004.
  const cents = Math.round(scaled + Math.min(scaled * Number.EPSILON, 1e-9));
  return cents === 0 ? 0 : Math.sign(value) * cents / 100;
}
