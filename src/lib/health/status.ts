export type DependencyState = "healthy" | "degraded" | "unhealthy";

export interface DependencyStatus {
  name: string;
  status: DependencyState;
  checkedAt: string;
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Compute the overall system health based on dependency statuses.
 * Prioritises the most severe state so dashboards can act accordingly.
 */
export function calculateOverallStatus(statuses: DependencyStatus[]): DependencyState {
  if (statuses.some((status) => status.status === "unhealthy")) {
    return "unhealthy";
  }

  if (statuses.some((status) => status.status === "degraded")) {
    return "degraded";
  }

  return "healthy";
}

export function mapStatusesByName(statuses: DependencyStatus[]): Record<string, DependencyStatus> {
  return statuses.reduce<Record<string, DependencyStatus>>((acc, status) => {
    acc[status.name] = status;
    return acc;
  }, {});
}
