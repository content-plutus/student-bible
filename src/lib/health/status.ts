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
 * Determine the overall system status from dependency statuses.
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

/**
 * Convert a dependency status array into a keyed object for easier lookups.
 */
export function mapStatusesByName(statuses: DependencyStatus[]): Record<string, DependencyStatus> {
  return statuses.reduce<Record<string, DependencyStatus>>((acc, status) => {
    acc[status.name] = status;
    return acc;
  }, {});
}
