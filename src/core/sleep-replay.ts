import { Temporal } from "@js-temporal/polyfill";

export const SLEEP_STAGES = ["LIGHT", "DEEP", "REM", "AWAKE", "ASLEEP", "RESTLESS", "UNKNOWN"] as const;
export type SleepStage = typeof SLEEP_STAGES[number];
export interface SleepSpan { start: number; end: number }
export interface SleepSegment extends SleepSpan { stage: SleepStage }
export interface SleepSession {
  id: string;
  startTime: string;
  segments: SleepSegment[];
  shortAwakenings?: SleepSpan[];
  returnSeconds?: number;
}

export interface DaySleepVoyage {
  session: SleepSession;
  offset: number;
  timeZone: string;
}

export const isAsleep = (stage: SleepStage) => stage !== "AWAKE" && stage !== "RESTLESS" && stage !== "UNKNOWN";
export const elapsedSeconds = (session: SleepSession) => session.segments.at(-1)?.end ?? 0;
export const asleepSeconds = (session: SleepSession) =>
  session.segments.reduce((sum, span) => sum + (isAsleep(span.stage) ? span.end - span.start : 0), 0);

export function sleepInstant(session: SleepSession, seconds: number) {
  return Temporal.Instant.from(session.startTime).add({nanoseconds: Math.round(seconds * 1e9)});
}

export function sleepSecondsSince(start: Temporal.Instant, end: Temporal.Instant) {
  return Number(end.epochNanoseconds - start.epochNanoseconds) / 1e9;
}

export function daySleepVoyages(sessions: readonly SleepSession[], date: string, timeZone: string): DaySleepVoyage[] {
  const dayStart = Temporal.PlainDate.from(date).toZonedDateTime(timeZone).toInstant();
  const entries = sessions.map(session => ({
    session, timeZone, offset: sleepSecondsSince(sleepInstant(session, 0), dayStart),
  })).sort((a, b) => b.offset - a.offset || a.session.id.localeCompare(b.session.id));
  return entries.map((entry, index) => {
    const next = entries[index + 1];
    if (!next) return entry;
    const gap = entry.offset - next.offset - elapsedSeconds(entry.session);
    return gap < 4200
      ? {...entry, session: {...entry.session, returnSeconds: Math.max(0, gap)}}
      : entry;
  });
}

export function voyageAt(entries: readonly DaySleepVoyage[], seconds: number, selectedId?: string) {
  const selected = selectedId && entries.find(entry => entry.session.id === selectedId);
  if (selected) return selected;
  let latest: DaySleepVoyage | undefined;
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index]!;
    const elapsed = entry.offset + seconds;
    if (elapsed < 0) continue;
    latest ??= entry;
    if (elapsed < elapsedSeconds(entry.session)) return entry;
  }
  return latest ?? entries[0] ?? null;
}
