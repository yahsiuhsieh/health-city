import { Temporal } from "@js-temporal/polyfill";

export type InspectionTable = { title: string; columns: string[]; rows: (string | number | null)[][] };
export type InspectionData = { count: number; tables: InspectionTable[]; notes: string[] };
export type DayWindow = { date: string; timeZone: string; nextDate: string; previousDate: string; start: string; end: string; following: string };

export function dayWindow(date: string, timeZone: string): DayWindow | null {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "0001-01-01" || date > "9998-12-31" ||
        timeZone.length > 100 || /^[+-]/.test(timeZone)) return null;
    const day = Temporal.PlainDate.from(date);
    const start = day.toZonedDateTime(timeZone);
    const end = day.add({ days: 1 }).toZonedDateTime(timeZone);
    if (start.toPlainDate().toString() !== date) return null;
    return {
      date, timeZone: start.timeZoneId, nextDate: day.add({ days: 1 }).toString(),
      start: start.toInstant().toString(), end: end.toInstant().toString(),
      previousDate: day.subtract({ days: 1 }).toString(),
      following: day.add({ days: 2 }).toZonedDateTime(timeZone).toInstant().toString(),
    };
  } catch { return null; }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Google Health object.");
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 1024) throw new Error("Invalid Google Health text.");
  return value;
}

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid Google Health number.");
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== "string" || !/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error("Invalid Google Health integer.");
  return Number(value);
}

function timestamp(value: unknown): string {
  return Temporal.Instant.from(text(value)).toString();
}

function interval(value: unknown): { start: string; end: string } {
  const data = object(value);
  const start = timestamp(data.startTime);
  const end = timestamp(data.endTime);
  if (Temporal.Instant.compare(start, end) >= 0) throw new Error("Invalid Google Health interval.");
  return { start, end };
}

function list(value: unknown): unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error("Invalid Google Health list.");
  return value;
}

function seconds(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "string" || !/^\d+(\.\d{1,9})?s$/.test(value)) throw new Error("Invalid Google Health duration.");
  return number(Number(value.slice(0, -1)));
}

function daily(value: unknown, date: string): Record<string, unknown> {
  const data = object(value);
  const source = object(data.date);
  const [year, month, day] = date.split("-").map(Number);
  if (source.year !== year || source.month !== month || source.day !== day) throw new Error("Unexpected Google Health date.");
  return data;
}

const table = (title: string, columns: string[], rows: InspectionTable["rows"]): InspectionTable => ({ title, columns, rows });
const milliseconds = (time: string) => Temporal.Instant.from(time).epochMilliseconds;

export function inspectRecords(kind: string, points: unknown[], window: DayWindow): InspectionData {
  const tables: InspectionTable[] = [];
  const notes: string[] = [];
  let count = points.length;
  if (kind === "daily-resting-heart-rate") {
    const rows = points.map((point) => {
      const data = daily(object(point).dailyRestingHeartRate, window.date);
      const metadata = data.dailyRestingHeartRateMetadata;
      const method = metadata == null ? null : object(metadata).calculationMethod;
      return [window.date, integer(data.beatsPerMinute), method == null ? null : text(method)];
    });
    tables.push(table("Daily resting heart rate", ["Source date", "Beats per minute", "Calculation method"], rows));
    notes.push("Calculation methods remain separate. No canonical value is selected.");
  } else if (kind === "daily-heart-rate-variability") {
    tables.push(table("Daily HRV", ["Source date", "Average HRV (ms)"], points.map((point) => {
      const data = daily(object(point).dailyHeartRateVariability, window.date);
      return [window.date, data.averageHeartRateVariabilityMilliseconds == null ? null : number(data.averageHeartRateVariabilityMilliseconds)];
    })));
    notes.push("A record can omit average HRV. An absent value remains unavailable.");
  } else if (kind === "total-calories") {
    const rows = points.map((point) => {
      const data = object(point);
      const time = interval(data);
      if (milliseconds(time.start) < milliseconds(window.start) || milliseconds(time.end) > milliseconds(window.end)) throw new Error("Unexpected calorie interval.");
      const calories = data.totalCalories == null ? null : object(data.totalCalories).kcalSum;
      return [time.start, time.end, calories == null ? null : number(calories)];
    });
    tables.push(table("Five-minute total calories", ["Start (UTC)", "End (UTC)", "Total kcal"], rows));
    notes.push("Total energy includes basal metabolism. Explicit zero and absent values remain distinct.");
    notes.push("Only returned buckets appear. An omitted bucket remains unavailable.");
  } else if (kind === "steps") {
    tables.push(table("Reconciled steps", ["Start (UTC)", "End (UTC)", "Steps"], points.map((point) => {
      const data = object(object(point).steps);
      const time = interval(data.interval);
      return [time.start, time.end, integer(data.count)];
    })));
    notes.push("These are reconciled source intervals. Boundary intervals remain complete and are not prorated.");
  } else if (kind === "heart-rate") {
    const bins = new Map<number, { sum: number; count: number; first: string; last: string }>();
    const start = milliseconds(window.start);
    const end = milliseconds(window.end);
    const seen = new Set<string>();
    for (const point of points) {
      const data = object(object(point).heartRate);
      const time = timestamp(object(data.sampleTime).physicalTime);
      const instant = milliseconds(time);
      if (instant < start || instant >= end || seen.has(time)) throw new Error("Unexpected or duplicate heart rate sample.");
      seen.add(time);
      const bpm = integer(data.beatsPerMinute);
      const bucket = Math.floor((instant - start) / 300_000);
      const bin = bins.get(bucket);
      if (bin) {
        bin.sum += bpm; bin.count++;
        if (time < bin.first) bin.first = time;
        if (time > bin.last) bin.last = time;
      } else bins.set(bucket, { sum: bpm, count: 1, first: time, last: time });
    }
    const rows: InspectionTable["rows"] = [];
    for (let bucket = 0; start + bucket * 300_000 < end; bucket++) {
      const from = start + bucket * 300_000;
      const bin = bins.get(bucket);
      rows.push([new Date(from).toISOString(), new Date(Math.min(from + 300_000, end)).toISOString(),
        bin ? bin.sum / bin.count : null, bin?.count ?? 0, bin?.first ?? null, bin?.last ?? null]);
    }
    tables.push(table("Five-minute sample means", ["Start (UTC)", "End (UTC)", "Mean bpm", "Samples", "First sample (UTC)", "Last sample (UTC)"], rows));
    notes.push("Means use returned samples only. Sample counts do not establish continuous sensor coverage.");
    notes.push("A partial read cannot establish complete daily means or missing intervals.");
  } else if (kind === "sleep") {
    count = 0;
    const sessions: InspectionTable["rows"] = [];
    points.forEach((point) => {
      const data = object(object(point).sleep);
      const time = interval(data.interval);
      if (milliseconds(time.start) >= milliseconds(window.end) || milliseconds(time.end) <= milliseconds(window.start)) return;
      const label = `Sleep ${++count}`;
      const stages = list(data.stages).map((stage) => {
        const segment = object(stage);
        const span = interval(segment);
        return [span.start, span.end, text(segment.type)];
      });
      const wakes = list(data.shortAwakenings).map((wake) => {
        const span = interval(wake);
        return [span.start, span.end];
      });
      sessions.push([label, time.start, time.end, data.type == null ? null : text(data.type), stages.length, wakes.length]);
      tables.push(table(`${label}: stages`, ["Start (UTC)", "End (UTC)", "Stage"], stages));
      tables.push(table(`${label}: short awakenings`, ["Start (UTC)", "End (UTC)"], wakes));
    });
    tables.unshift(table("Complete sleep sessions intersecting the day", ["Session", "Start (UTC)", "End (UTC)", "Type", "Stage segments", "Short awakenings"], sessions));
    notes.push("Short awakenings can overlap stages. Their durations are not added to stage durations.");
    notes.push("The bounded query includes sessions ending on the selected or following date. Longer sessions can exceed this query window.");
  } else if (kind === "exercise") {
    count = 0;
    const sessions: InspectionTable["rows"] = [];
    points.forEach((point) => {
      const data = object(object(point).exercise);
      const time = interval(data.interval);
      if (milliseconds(time.start) >= milliseconds(window.end) || milliseconds(time.end) <= milliseconds(window.start)) return;
      const label = `Exercise ${++count}`;
      const summary = data.metricsSummary == null ? null : object(data.metricsSummary);
      const zones = summary?.heartRateZoneDurations == null ? null : object(summary.heartRateZoneDurations);
      sessions.push([label, time.start, time.end, text(data.exerciseType), seconds(data.activeDuration),
        zones ? seconds(zones.vigorousTime) : null, zones ? seconds(zones.peakTime) : null]);
      tables.push(table(`${label}: events`, ["Time (UTC)", "Event"], list(data.exerciseEvents).map((event) => {
        const item = object(event);
        return [timestamp(item.eventTime), text(item.type)];
      })));
    });
    tables.unshift(table("Complete exercise sessions intersecting the day", ["Session", "Start (UTC)", "Completion (UTC)", "Type", "Active seconds", "Vigorous seconds", "Peak seconds"], sessions));
    notes.push("Active duration excludes pauses. Absent zone durations remain unavailable.");
    notes.push("The bounded query includes starts on the previous or selected date. Longer sessions can exceed this query window.");
  } else if (kind === "time-in-heart-rate-zone") {
    tables.push(table("Reconciled heart rate zones", ["Start (UTC)", "End (UTC)", "Zone"], points.map((point) => {
      const data = object(object(point).timeInHeartRateZone);
      const time = interval(data.interval);
      return [time.start, time.end, text(data.heartRateZoneType)];
    })));
    notes.push("Zone intervals alone do not establish exercise coverage or a flower saturation value.");
  } else throw new Error("Unknown health inspection type.");
  return { count, tables, notes };
}
