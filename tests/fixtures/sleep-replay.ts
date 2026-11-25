export const sleepZone = "America/Chicago";
export const sleepDate = "2026-11-08";
export const sleepStartDate = "2026-11-07";
const span = (startTime: string, endTime: string) => ({ startTime, endTime });
const day = (time: string) => "2026-11-08T" + time + "Z";

export const overnightSleep = {
  name: "fixture-provider-record",
  sleep: {
    interval: span(day("05:00:00"), day("13:00:00")),
    type: "STAGES",
    stages: [
      {...span(day("05:00:00"), day("07:00:00")), type: "LIGHT"},
      {...span(day("07:00:00"), day("07:05:00")), type: "AWAKE"},
      {...span(day("07:05:00"), day("13:00:00")), type: "DEEP"},
    ],
    shortAwakenings: [
      span(day("06:58:00"), day("07:01:00")),
      span(day("06:59:00"), day("07:07:00")),
    ],
  },
};

export const napSleep = {
  sleep: {
    interval: span(day("20:00:00"), day("20:30:00")),
    type: "CLASSIC",
    metadata: { nap: true },
    summary: { minutesAsleep: "30" },
  },
};

export const sleepWithMissingStages = {
  sleep: {
    interval: span(day("23:00:00"), day("23:30:00")),
    type: "STAGES",
  },
};
