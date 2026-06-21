import type { GapPublic } from "../types/api";

const SEVERITY_RISK: Record<string, number> = {
  critical: 0.9,
  high: 0.7,
  medium: 0.5,
  low: 0.3,
  info: 0.1,
};

/** Risk score 0-1 from API field or derived from severity. */
export function getGapRiskScore(gap: GapPublic): number {
  if (gap.risk_score != null && !Number.isNaN(Number(gap.risk_score))) {
    return Number(gap.risk_score);
  }
  const severity = (gap.severity || gap.severity_level || "").toLowerCase();
  return SEVERITY_RISK[severity] ?? 0.5;
}

/** Risk score as integer 0-100 for badges. */
export function getGapRiskPercent(gap: GapPublic): number {
  return Math.round(getGapRiskScore(gap) * 100);
}

export function getGapSeverity(gap: GapPublic): string | null {
  return gap.severity || gap.severity_level || null;
}
