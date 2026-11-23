export interface ReplaySnapshot {
  seconds: number;
  playing: boolean;
  speed: number;
}

// A provisional safety threshold. Primary-desktop measurements must calibrate it.
export const INTERRUPTION_SECONDS = 1;

export function createReplay(durationSeconds: number) {
  let snapshot: ReplaySnapshot = { seconds: 0, playing: false, speed: 240 };
  let baseline: number | null = null;
  let lastNotification = 0;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  const replace = (next: ReplaySnapshot) => { snapshot = next; notify(); };

  return {
    durationSeconds,
    read: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    play() {
      if (snapshot.seconds >= durationSeconds) return;
      baseline = null;
      replace({ ...snapshot, playing: true });
    },
    pause() {
      baseline = null;
      replace({ ...snapshot, playing: false });
    },
    seek(seconds: number) {
      if (!Number.isFinite(seconds)) return;
      baseline = null;
      const bounded = Math.max(0, Math.min(durationSeconds, seconds));
      replace({ ...snapshot, seconds: bounded, playing: bounded === durationSeconds ? false : snapshot.playing });
    },
    setSpeed(speed: number) {
      if (!Number.isFinite(speed) || speed <= 0) return;
      baseline = null;
      replace({ ...snapshot, speed });
    },
    frame(nowSeconds: number) {
      const previous = baseline;
      baseline = nowSeconds;
      if (!snapshot.playing || previous === null) return;
      const delta = nowSeconds - previous;
      if (delta < 0 || delta > INTERRUPTION_SECONDS) {
        this.pause();
        return;
      }
      const seconds = Math.min(durationSeconds, snapshot.seconds + delta * snapshot.speed);
      snapshot = { ...snapshot, seconds, playing: seconds < durationSeconds };
      // Scene objects read every frame. React only receives periodic clock labels.
      if (nowSeconds - lastNotification >= 0.1 || !snapshot.playing) {
        lastNotification = nowSeconds;
        notify();
      }
    },
  };
}

export type Replay = ReturnType<typeof createReplay>;
