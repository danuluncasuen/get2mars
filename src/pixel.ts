// The display draws at device resolution, so a moving thing can sit between game pixels
// instead of jumping a whole one (about 5 points on a phone) at a time. Its art stays on
// the game's pixel grid; only where it is drawn gets finer.
let subPixels = 1;

// Called by the display with how many device pixels make one game pixel.
export function setSubPixels(n: number): void {
  subPixels = Math.max(1, n);
}

// Rounds a position to the nearest device pixel, so edges stay crisp.
export function snap(v: number): number {
  return Math.round(v * subPixels) / subPixels;
}
