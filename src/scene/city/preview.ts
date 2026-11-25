export const cityPreview = import.meta.env.DEV && typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("citySlice") === "1";

export const reviewViews=import.meta.env.DEV && typeof window!=="undefined" &&
  (cityPreview || ["reviewViews","reviewPlot","reviewCoast","reviewStreet","sleepPreview","wakePreview","sleepCompanion"].some(key=>new URLSearchParams(window.location.search).has(key)));
