export const cityPreview = import.meta.env.DEV && typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("citySlice") === "1";
