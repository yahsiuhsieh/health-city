export const palette = {
  asphalt: "#55595b", marking: "#e9e6dc", yellow: "#d8b448",
  sidewalk: "#c8c3b6", curb: "#a9a49a", promenade: "#b9a58c",
  promenadeJoint: "#a8957d", plaza: "#c2b29a", lawn: "#86a862",
  lawnShade: "#6f9152", planting: "#7f9a5c", soil: "#6d5a45",
  courtyard: "#93ad6c", quay: "#a7a69a", seawall: "#8d8a80",
  wetWall: "#5e5d57", beach: "#dccb9c",
  downtown: ["#d9cfbd", "#c9b89c", "#b9a690", "#a8b2ad"],
  canopy: ["#6f8f55", "#7f9c5e", "#5e7f4c"], trunk: "#6a5440",
} as const;

export const cityLight = {
  day: { sun: "#fff1d6", intensity: 3, sky: "#dce8ef", ground: "#8a8f7f", fill: 1.2, air: "#cfe0ea" },
  night: { sun: "#b5cfe5", intensity: .8, sky: "#9fb6c8", ground: "#2f4448", fill: .9, air: "#1f3541" },
};
