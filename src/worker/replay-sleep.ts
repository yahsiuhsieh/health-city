import { Temporal } from "@js-temporal/polyfill";
import { SLEEP_STAGES, sleepSecondsSince } from "../core/sleep-replay.ts";
import type { SleepSegment, SleepSession, SleepSpan, SleepStage } from "../core/sleep-replay.ts";
import { interval, list, object } from "./health-data.ts";
import type { DayWindow } from "./health-data.ts";

function normalizeStages(stages: SleepSegment[], wakes: SleepSpan[], duration: number): SleepSegment[] {
  const events = new Map<number, {stage: SleepStage; change: number}[]>([[0, []], [duration, []]]);
  const add = (time: number, stage: SleepStage, change: number) => {
    const boundary = events.get(time);
    if (boundary) boundary.push({stage, change});
    else events.set(time, [{stage, change}]);
  };
  for (const span of stages) {
    add(span.start, span.stage, 1);
    add(span.end, span.stage, -1);
  }
  for (const span of wakes) {
    add(span.start, "AWAKE", 1);
    add(span.end, "AWAKE", -1);
  }

  const bounds = [...events.keys()].sort((a, b) => a - b);
  const active = new Map<SleepStage, number>();
  const normalized: SleepSegment[] = [];
  for (let i = 1; i < bounds.length; i++) {
    const start = bounds[i - 1]!, end = bounds[i]!;
    for (const {stage, change} of events.get(start)!) {
      const count = (active.get(stage) ?? 0) + change;
      if (count) active.set(stage, count);
      else active.delete(stage);
    }
    const stage = active.has("AWAKE") ? "AWAKE" : active.size === 1 ? active.keys().next().value! : "UNKNOWN";
    const previous = normalized.at(-1);
    if (previous?.stage === stage) previous.end = end;
    else normalized.push({ start, end, stage });
  }
  return normalized;
}

export function replaySleep(points: unknown[], window: DayWindow): SleepSession[] {
  const dayStart = Temporal.Instant.from(window.start), dayEnd = Temporal.Instant.from(window.end);
  const sessions = new Map<string, SleepSession>();
  for (const point of points) {
    const data = object(object(point).sleep);
    const bounds = interval(data.interval);
    const begin = Temporal.Instant.from(bounds.start), end = Temporal.Instant.from(bounds.end);
    if (Temporal.Instant.compare(begin, dayEnd) >= 0 || Temporal.Instant.compare(end, dayStart) <= 0) continue;

    const duration = sleepSecondsSince(begin, end);
    function relativeSpan(raw: unknown) {
      const time = interval(raw);
      const start = sleepSecondsSince(begin, Temporal.Instant.from(time.start));
      const end = sleepSecondsSince(begin, Temporal.Instant.from(time.end));
      if (start < 0 || end > duration || start >= end) throw new Error("Invalid sleep segment interval.");
      return { start, end };
    }
    const stages = list(data.stages).map(raw => {
      const type = object(raw).type;
      const stage = SLEEP_STAGES.find(stage => stage === type) ?? "UNKNOWN";
      return {...relativeSpan(raw), stage};
    });
    const summary = data.summary == null ? null : object(data.summary);
    // A full-duration sleep total establishes an unclassified interval when stages are absent.
    if (!stages.length && Number.isInteger(duration / 60) && summary?.minutesAsleep === String(duration / 60)) {
      stages.push({ start: 0, end: duration, stage: "ASLEEP" });
    }
    const shortAwakenings = list(data.shortAwakenings).map(relativeSpan).sort((a, b) => a.start - b.start || a.end - b.end);
    const startTime = begin.toString(), id = startTime + "/" + end.toString();
    const session = { id, startTime, segments: normalizeStages(stages, shortAwakenings, duration), shortAwakenings };
    const previouslyRead = sessions.get(id);
    if (previouslyRead && JSON.stringify(previouslyRead) !== JSON.stringify(session)) {
      throw new Error("Sleep records with the same interval disagree.");
    }
    sessions.set(id, session);
  }
  return [...sessions.values()];
}
