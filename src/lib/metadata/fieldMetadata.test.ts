import { getFieldMetadata } from "@/lib/metadata/fieldMetadata";

describe("field metadata helper", () => {
  it("returns metadata for all tables", () => {
    const result = getFieldMetadata();

    expect(result.tables.length).toBeGreaterThan(0);
    const studentsTable = result.tables.find((table) => table.name === "students");

    expect(studentsTable).toBeDefined();
    expect(studentsTable?.jsonbColumns.some((column) => column.column === "extra_fields")).toBe(
      true,
    );
    const extraFields = studentsTable?.jsonbColumns.find(
      (column) => column.column === "extra_fields",
    );
    expect(extraFields?.fields.some((field) => field.name === "guardian_email")).toBe(true);
  });

  it("filters by table and column", () => {
    const result = getFieldMetadata({ table: "students", column: "extra_fields" });

    expect(result.tables).toHaveLength(1);
    const studentsTable = result.tables[0];
    expect(studentsTable.name).toBe("students");
    expect(studentsTable.jsonbColumns).toHaveLength(1);
    expect(studentsTable.jsonbColumns[0].column).toBe("extra_fields");
  });
});
