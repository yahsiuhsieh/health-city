import { islandShape } from "./island-shape.ts";
import { SYNTHETIC_SESSION, type SleepSession } from "./session.ts";

const shapes = new WeakMap<SleepSession, ReturnType<typeof islandShape>>();
export function destination(session: SleepSession) {
  const cached = shapes.get(session);
  if (cached) return cached;
  const raw = session === SYNTHETIC_SESSION && import.meta.env.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("sleepPreview") : null;
  const minutes = Number(raw);
  const shape = islandShape(session, [5, 20, 60, 180, 240, 442, 480, 720].includes(minutes) ? minutes : undefined);
  shapes.set(session, shape);
  return shape;
}
