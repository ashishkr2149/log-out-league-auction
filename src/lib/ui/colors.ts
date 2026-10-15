/** Brand-safe palette for auto-assigned team/tournament colors (no user picker). */
const PRIMARY_PALETTE = [
  '#e11d48', // scarlet
  '#2563eb', // blue
  '#059669', // green
  '#d97706', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#db2777', // pink
  '#4f46e5', // indigo
  '#0f766e', // teal
  '#b45309', // bronze
] as const;

/**
 * Deterministic-ish random colors for create flows.
 * Secondary is always near-white for contrast on badges.
 */
export function randomBrandColors(seed?: string): {
  primary_color: string;
  secondary_color: string;
} {
  let idx: number;
  if (seed && seed.length > 0) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    idx = h % PRIMARY_PALETTE.length;
  } else {
    idx = Math.floor(Math.random() * PRIMARY_PALETTE.length);
  }
  return {
    primary_color: PRIMARY_PALETTE[idx],
    secondary_color: '#ffffff',
  };
}
