export const COLLABORATOR_COLORS = [
  "#0BBFBF", // lagoon
  "#FF6B47", // coral
  "#FFB347", // sunshine
  "#7F77DD", // iris
  "#1D9E75", // moss
] as const;

export const FALLBACK_COLOR = "#1A2E2E"; // ocean

export function colorForTurnOrder(turnOrder: number | null | undefined): string {
  if (!turnOrder || turnOrder < 1) return COLLABORATOR_COLORS[0];
  return COLLABORATOR_COLORS[(turnOrder - 1) % COLLABORATOR_COLORS.length];
}
