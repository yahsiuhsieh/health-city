import { expect, it, vi } from "vitest";
import { napSleep, overnightSleep, sleepDate, sleepStartDate, sleepWithMissingStages, sleepZone } from "../../tests/fixtures/sleep-replay.ts";
import { asleepSeconds, daySleepVoyages, voyageAt } from "../core/sleep-replay.ts";
import { destination } from "../scene/sleep/island-preview.ts";
import { voyage } from "../scene/sleep-voyage.ts";
import { islandRevealAt } from "../scene/sleep/timeline.ts";
import { createGoogleHealthClient } from "./google-health.ts";
import { dayWindow } from "./health-data.ts";
import { replaySleep } from "./replay-sleep.ts";

const window = dayWindow(sleepDate, sleepZone)!;

it("reads all pages, preserves the session across midnight, and merges overlapping awake time once", async () => {
  const requests: URL[] = [];
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    requests.push(url);
    return url.searchParams.has("pageToken")
      ? Response.json({dataPoints:[overnightSleep, napSleep]})
      : Response.json({dataPoints:[overnightSleep], nextPageToken:"next"});
  };
  const active = vi.fn(async () => true);
  const records = await createGoogleHealthClient(fetcher).readReplaySleep("fixture", window, active);
  expect(active).toHaveBeenCalledTimes(2);
  expect(requests[0]?.pathname).toBe("/v4/users/me/dataTypes/sleep/dataPoints:reconcile");
  expect(requests[0]?.searchParams.get("filter")).toBe(
    'sleep.interval.end_time >= "2026-11-08T06:00:00Z" AND sleep.interval.end_time < "2026-11-10T06:00:00Z"',
  );
  expect(requests[1]?.searchParams.get("pageToken")).toBe("next");
  expect(records).toHaveLength(2);
  expect(JSON.stringify(records)).not.toContain("fixture-provider-record");
  const [overnight, nap] = records;
  expect(overnight?.segments).toEqual([
    {start:0, end:7080, stage:"LIGHT"},
    {start:7080, end:7620, stage:"AWAKE"},
    {start:7620, end:28800, stage:"DEEP"},
  ]);
  expect(overnight?.shortAwakenings).toEqual([{start:7080,end:7260},{start:7140,end:7620}]);
  expect(asleepSeconds(overnight!)).toBe(471 * 60);
  expect(destination(overnight!).area).toBe(11304);
  expect(destination(nap!).area).toBe(720);

  const first = dayWindow(sleepStartDate, sleepZone)!;
  const previous = daySleepVoyages(replaySleep([overnightSleep,napSleep],first), sleepStartDate, sleepZone);
  const selectedDay = daySleepVoyages(records, sleepDate, sleepZone);
  expect(previous).toHaveLength(1);
  expect(previous[0]?.session).toEqual(overnight);
  expect(voyage(previous[0]!, 86400)).toEqual(voyage(selectedDay[0]!, 0));
  for (const seconds of [3480, 3900]) {
    expect(voyage(selectedDay[0]!, seconds).stage).toBe("AWAKE");
    expect(voyage(selectedDay[0]!, seconds).progress).toBe(voyage(selectedDay[0]!, 3480).progress);
  }
  const morning = voyageAt(selectedDay, 7 * 3600)!;
  const afternoon = voyageAt(selectedDay, 14 * 3600)!;
  expect(morning.session.id).toBe(overnight?.id);
  expect(afternoon.session.id).toBe(nap?.id);
  expect(voyageAt(selectedDay, 14 * 3600, overnight?.id)).toBe(morning);
  expect(voyage(afternoon, 14 * 3600).stage).toBe("ASLEEP");
  expect(islandRevealAt(afternoon.session, 1800)).toBe(1);
});

it("keeps missing stage data, confirmed absence, and an incomplete read distinct", async () => {
  const [session] = replaySleep([sleepWithMissingStages], window);
  expect(session?.segments).toEqual([{start:0,end:1800,stage:"UNKNOWN"}]);
  expect(asleepSeconds(session!)).toBe(0);
  expect(voyage(daySleepVoyages([session!],sleepDate,sleepZone)[0]!,17*3600).moored).toBe(true);
  expect(voyage(voyageAt([], 1234), 1234).moored).toBe(true);
  const empty = createGoogleHealthClient(async () => Response.json({}));
  await expect(empty.readReplaySleep("fixture", window, async () => true)).resolves.toEqual([]);
  const incomplete = createGoogleHealthClient(async () => Response.json({dataPoints:[overnightSleep],nextPageToken:"repeat"}));
  await expect(incomplete.readReplaySleep("fixture", window, async () => true)).rejects.toThrow("invalid page");
});

it("uses elapsed seconds when the clock repeats an hour", () => {
  const date = "2026-11-01";
  const interval = {startTime:"2026-11-01T06:30:00Z",endTime:"2026-11-01T07:30:00Z"};
  const [session] = replaySleep([{sleep:{interval,stages:[{...interval,type:"ASLEEP"}]}}], dayWindow(date,sleepZone)!);
  expect(asleepSeconds(session!)).toBe(3600);
  expect(daySleepVoyages([session!],date,sleepZone)[0]?.offset).toBe(-5400);
});

it("returns the boat before the next voyage when two sessions are close together", () => {
  const interval = {startTime:"2026-11-08T13:12:00Z",endTime:"2026-11-08T13:32:00Z"};
  const second = {sleep:{interval,stages:[{...interval,type:"ASLEEP"}]}};
  const day = daySleepVoyages(replaySleep([overnightSleep,second],window),sleepDate,sleepZone);
  const first = day[0]!;
  expect(first.session.returnSeconds).toBe(720);
  expect(voyage(first,7*3600+200).stage).toBe("Returning");
  expect(voyage(first,7*3600+720).moored).toBe(true);
  expect(voyageAt(day,7*3600+720)?.session.id).toBe(day[1]?.session.id);
});
