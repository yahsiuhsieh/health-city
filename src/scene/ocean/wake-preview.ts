export const wakePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("wakePreview") === "1";
