export type RhrRecord = { bpm: number; method: string | null };

export function validRhrRecords(value: unknown): value is RhrRecord[] {
  return Array.isArray(value) && value.every(record => record !== null && typeof record === "object" &&
    Number.isSafeInteger(record.bpm) && record.bpm > 0 &&
    (record.method === null || typeof record.method === "string"));
}

export function canonicalRhr(records: readonly RhrRecord[]) {
  const preferred = ["WITH_SLEEP", "ONLY_WITH_AWAKE_DATA"].find(method =>
    records.some(record => record.method === method));
  const candidates = preferred ? records.filter(record => record.method === preferred) : records;
  const first = candidates[0];
  if (!first) return { status: "none" } as const;
  if (candidates.some(record => record.bpm !== first.bpm || record.method !== first.method)) {
    return { status: "conflict", records } as const;
  }
  return { status: "value", bpm: first.bpm, method: first.method } as const;
}

export function reservoirLevel(bpm: number) {
  return 4 + (Math.min(80, Math.max(40, bpm)) - 40) * 0.4;
}
