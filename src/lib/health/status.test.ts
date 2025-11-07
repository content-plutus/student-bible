import { calculateOverallStatus, mapStatusesByName, type DependencyStatus } from "./status";

const baseStatus = (overrides: Partial<DependencyStatus> = {}): DependencyStatus => ({
  name: overrides.name ?? "test",
  status: overrides.status ?? "healthy",
  checkedAt: overrides.checkedAt ?? new Date().toISOString(),
  ...overrides,
});

describe("calculateOverallStatus", () => {
  it("returns healthy when all dependencies are healthy", () => {
    const status = calculateOverallStatus([
      baseStatus({ name: "db" }),
      baseStatus({ name: "env" }),
    ]);

    expect(status).toBe("healthy");
  });

  it("returns degraded when at least one dependency is degraded", () => {
    const status = calculateOverallStatus([
      baseStatus({ name: "db", status: "degraded" }),
      baseStatus({ name: "env" }),
    ]);

    expect(status).toBe("degraded");
  });

  it("returns unhealthy when any dependency is unhealthy", () => {
    const status = calculateOverallStatus([
      baseStatus({ name: "db", status: "unhealthy" }),
      baseStatus({ name: "env", status: "degraded" }),
    ]);

    expect(status).toBe("unhealthy");
  });
});

describe("mapStatusesByName", () => {
  it("converts an array of statuses into a keyed object", () => {
    const statuses = [baseStatus({ name: "db" }), baseStatus({ name: "env", status: "degraded" })];

    const map = mapStatusesByName(statuses);

    expect(map.db.status).toBe("healthy");
    expect(map.env.status).toBe("degraded");
  });
});
