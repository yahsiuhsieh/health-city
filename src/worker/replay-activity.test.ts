import { expect, it, vi } from "vitest";
import { dayWindow } from "./health-data.ts";
import { createGoogleHealthClient } from "./google-health.ts";
import { replayTotals } from "./replay-activity.ts";

const window = dayWindow("2026-11-01", "America/Chicago")!;
const time = (minute: number) => new Date(Date.parse(window.start) + minute * 60_000).toISOString();
const interval = (start: number, end: number) => ({ startTime: time(start), endTime: time(end) });
const steps = (start: number, end: number, count: number) => ({ steps: { count: String(count), interval: interval(start, end) } });
const calories = (start: number, end: number, kcalSum: number) => ({ ...interval(start, end), totalCalories: { kcalSum } });

it("combines reconciled steps across pages, preserves zero, and marks unsplittable buckets unavailable", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ dataPoints: [steps(0, 1, 21)], nextPageToken: "second" }))
    .mockResolvedValueOnce(Response.json({ dataPoints: [steps(1, 2, 61), steps(5, 6, 0), steps(14, 16, 40)] }));
  const result = await createGoogleHealthClient(fetcher).readReplayActivity("steps", "test", window, async () => true);
  expect(result).toHaveLength(300);
  expect(result.slice(0, 5)).toEqual([82, 0, null, null, null]);
  expect(new URL(String(fetcher.mock.calls[1]![0])).searchParams.get("pageToken")).toBe("second");
});

it("aligns energy buckets to local midnight and rejects overlap, negative values, and partial buckets", () => {
  const result = replayTotals("total-calories", [calories(0, 5, 0), calories(1495, 1500, 12)], window);
  expect(result[0]).toBe(0);
  expect(result[1]).toBeNull();
  expect(result[299]).toBe(12);
  expect(() => replayTotals("total-calories", [calories(0, 4, 10)], window)).toThrow();
  const fractional = calories(0, 5, 12);
  fractional.endTime = fractional.endTime.replace(".000Z", ".000000001Z");
  expect(() => replayTotals("total-calories", [fractional], window)).toThrow();
  expect(() => replayTotals("steps", [steps(0, 2, 10), steps(1, 2, 15)], window)).toThrow();
  expect(() => replayTotals("steps", [steps(0, 1, -1)], window)).toThrow();
});

it("rejects unfinished activity pagination without returning partial totals", async () => {
  let page = 0;
  const client = createGoogleHealthClient(async () => Response.json({ nextPageToken: String(++page) }));
  await expect(client.readReplayActivity("steps", "test", window, async () => true)).rejects.toThrow("did not complete");
  expect(page).toBe(5);
});
