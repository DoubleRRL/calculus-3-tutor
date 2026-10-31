/** Poster palette — art-local constants sampled from the Matisse-cut
 *  reference. Mid-tones chosen to sit well on both light (--bg #f3ede2)
 *  and dark (--bg #1c1914) themes without touching app tokens. */
export const ART = {
  ink: "#2c261f",
  paper: "#faf6ee",
  cream: "#eadfc6",
  terracotta: "#c4744e",
  rust: "#b85c45",
  sage: "#7d8b6a",
  lavender: "#8f8bc9",
  ochre: "#d9a05b",
  blush: "#cf9b82",
} as const;

export type ArtTone = Exclude<keyof typeof ART, "ink" | "paper">;
