import { calculateOverallStatus, mapStatusesByName, type DependencyStatus } from "./status";

const buildStatus = (overrides: Partial<DependencyStatus> = {}): DependencyStatus => ({
  name: overrides.name ?? "dependency",
  status: overrides.status ?? "healthy",
  checkedAt: overrides.checkedAt ?? new Date().toISOString(),
  ...overrides,
});

describe("calculateOverallStatus", () => {
  it("returns healthy when all dependencies are healthy", () => {
    const result = calculateOverallStatus([
      buildStatus({ name: "db" }),
      buildStatus({ name: "env" }),
    ]);

    expect(result).toBe("healthy");
  });

  it("returns degraded when at least one dependency is degraded", () => {
    const result = calculateOverallStatus([
      buildStatus({ name: "db", status: "degraded" }),
      buildStatus({ name: "env" }),
    ]);

    expect(result).toBe("degraded");
  });

  it("returns unhealthy when any dependency is unhealthy", () => {
    const result = calculateOverallStatus([
      buildStatus({ name: "db", status: "unhealthy" }),
      buildStatus({ name: "env" }),
    ]);

    expect(result).toBe("unhealthy");
  });
});

describe("mapStatusesByName", () => {
  it("returns a map keyed by dependency name", () => {
    const statuses = [
      buildStatus({ name: "db" }),
      buildStatus({ name: "env", status: "degraded" }),
    ];

    const map = mapStatusesByName(statuses);

    expect(map.db.status).toBe("healthy");
    expect(map.env.status).toBe("degraded");
  });
});
