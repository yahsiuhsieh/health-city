import { describe, expect, it } from "vitest";
import { createReplay, INTERRUPTION_SECONDS } from "./replay.ts";
import { boatPose, SYNTHETIC_DAYS } from "./representative-day.ts";

const [representativeDay] = SYNTHETIC_DAYS;

describe("representative day replay", () => {
  it("opens paused at midnight and advances only after Play", () => {
    const replay = createReplay(representativeDay.durationSeconds);
    replay.frame(1);
    replay.frame(1.5);
    expect(replay.read()).toEqual({ seconds: 0, playing: false, speed: 240 });
    replay.play();
    replay.frame(2);
    replay.frame(2.5);
    expect(replay.read().seconds).toBe(120);
    expect(representativeDay.replayLabel(replay.read().seconds)).toBe("00:02");
  });

  it("freezes motion while paused and restores poses when seeking backward", () => {
    const replay = createReplay(86400);
    replay.seek(400);
    const original = boatPose(replay.read().seconds);
    replay.frame(1);
    replay.frame(1.5);
    expect(boatPose(replay.read().seconds)).toEqual(original);
    replay.seek(700);
    expect(boatPose(replay.read().seconds)).not.toEqual(original);
    replay.seek(400);
    expect(boatPose(replay.read().seconds)).toEqual(original);
  });

  it("pauses after interruption without advancing unseen replay time", () => {
    const replay = createReplay(86400);
    replay.play();
    replay.frame(10);
    replay.frame(10.5);
    const last = replay.read().seconds;
    replay.frame(10.5 + INTERRUPTION_SECONDS + .1);
    expect(replay.read().seconds).toBe(last);
    expect(replay.read().playing).toBe(false);
    replay.frame(500);
    replay.play();
    replay.frame(900);
    expect(replay.read().seconds).toBe(last);
    replay.frame(900.5);
    expect(replay.read().seconds).toBe(last + 120);
  });

  it("rebases frames after seeking and speed changes and bounds the day", () => {
    const replay = createReplay(86400);
    replay.play();
    replay.frame(1);
    replay.seek(100);
    replay.frame(2);
    expect(replay.read().seconds).toBe(100);
    replay.setSpeed(60);
    replay.frame(3);
    replay.frame(3.5);
    expect(replay.read().seconds).toBe(130);
    replay.seek(86400);
    expect(replay.read().playing).toBe(false);
    expect(representativeDay.replayLabel(replay.read().seconds)).toBe("24:00");
    replay.play();
    expect(replay.read().playing).toBe(false);
    replay.seek(-50);
    expect(replay.read().seconds).toBe(0);
    replay.seek(Number.NaN);
    expect(replay.read().seconds).toBe(0);
  });

  it("preserves the actual length of a clock-change day", () => {
    const replay = createReplay(25 * 3600);
    replay.seek(24 * 3600);
    replay.play();
    expect(replay.read().playing).toBe(true);
    replay.seek(25 * 3600 - 20);
    replay.frame(1);
    replay.frame(1.5);
    expect(replay.read()).toEqual({ seconds: 90000, playing: false, speed: 240 });
  });
});
