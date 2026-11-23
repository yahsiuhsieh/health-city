import { useCallback, useEffect, useRef, useState } from "react";
import { DAILY_HRV_PATH, parseDailyHrvResponse } from "../core/daily-hrv.ts";
import type { HrvSource } from "../core/daily-hrv.ts";
import { RECORDED_REPLAY_PATH, parseRecordedReplay } from "../core/recorded-replay.ts";
import type { RecordedReplay } from "../core/recorded-replay.ts";
import type { ReplayDay } from "../core/representative-day.ts";

type LoadState =
  | { status: "idle" | "loading" | "sign-in" | "renew" | "error" }
  | { status: "ready"; rmssdMs: number | null; recorded?: RecordedReplay };

export function useDayReplay(source: HrvSource, day: ReplayDay) {
  const example = source === "synthetic";
  const [result, setResult] = useState<{ day: ReplayDay; state: LoadState }>();
  const [googleHealthEnabled, setGoogleHealthEnabled] = useState(false);
  const active = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    active.current?.abort();
    const request = new AbortController();
    active.current = request;
    const apply = (state: LoadState) => {
      if (!request.signal.aborted) setResult({ day, state });
    };
    apply({ status: "loading" });
    try {
      const { date, zone, durationSeconds } = day;
      const response = await fetch(example ? DAILY_HRV_PATH + "?" + new URLSearchParams({ date }) : RECORDED_REPLAY_PATH, {
        method: example ? "GET" : "POST",
        ...(example ? {} : { body: new URLSearchParams({ date, timeZone: zone }) }),
        signal: request.signal,
        redirect: "error",
        cache: "no-store",
      });
      if (response.status === 401) { apply({ status: "sign-in" }); return; }
      if (response.status === 409) { apply({ status: "renew" }); return; }
      if (!response.ok) throw new Error("Could not load replay data.");
      const json: unknown = await response.json();
      if (request.signal.aborted) return;
      if (example) {
        const payload = parseDailyHrvResponse(json, source, date);
        if (!payload) throw new Error("Invalid daily HRV response.");
        setGoogleHealthEnabled(payload.googleHealthEnabled);
        apply({ status: "ready", rmssdMs: payload.hrv.rmssdMs });
      } else {
        const recorded = parseRecordedReplay(json, date, zone, durationSeconds);
        if (!recorded) throw new Error("Invalid day replay response.");
        apply({ status: "ready", recorded, rmssdMs: recorded.hrv.status === "ready" ? recorded.hrv.value : null });
      }
    } catch {
      apply({ status: "error" });
    }
  }, [day, example, source]);

  useEffect(() => {
    if (example) void load();
    return () => active.current?.abort();
  }, [example, load]);

  const state: LoadState = result?.day === day ? result.state : { status: example ? "loading" : "idle" };
  return { state, load, googleHealthEnabled };
}
