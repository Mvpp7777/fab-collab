export const COLLABORATOR_COLORS = [
  "#0BBFBF", // lagoon
  "#FF6B47", // coral
  "#FFB347", // sunshine
  "#7F77DD", // iris
  "#1D9E75", // moss
] as const;

// Visible teal — used when a collaborator's color is somehow unresolved.
// Previously ocean (#1A2E2E) which read as a dark/black avatar circle.
export const FALLBACK_COLOR = "#0BBFBF";

export function colorForTurnOrder(turnOrder: number | null | undefined): string {
  if (!turnOrder || turnOrder < 1) return COLLABORATOR_COLORS[0];
  return COLLABORATOR_COLORS[(turnOrder - 1) % COLLABORATOR_COLORS.length];
}
