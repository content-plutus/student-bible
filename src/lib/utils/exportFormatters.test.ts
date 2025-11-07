/**
 * @jest-environment node
 */
import {
  exportToCSV,
  exportToJSON,
  exportToXLSX,
  flattenStudentRecord,
  getMimeType,
  getFileExtension,
} from "@/lib/utils/exportFormatters";

describe("Export Formatters", () => {
  const mockStudent = {
    id: "123",
    phone_number: "9876543210",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    date_of_birth: "2000-01-01",
    enrollment_status: "Active",
    extra_fields: {
      certification_type: "TypeA",
      batch_code: "BATCH001",
    },
  };

  describe("flattenStudentRecord", () => {
    it("should flatten student record with core fields only", () => {
      const fields = ["id", "phone_number", "email", "first_name"];
      const result = flattenStudentRecord(mockStudent, fields, false);

      expect(result).toEqual({
        id: "123",
        phone_number: "9876543210",
        email: "test@example.com",
        first_name: "Test",
      });
    });

    it("should include extra_fields when includeExtraFields is true", () => {
      const fields = ["id", "phone_number"];
      const result = flattenStudentRecord(mockStudent, fields, true);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("phone_number");
      expect(result["extra_fields.certification_type"]).toBe("TypeA");
      expect(result["extra_fields.batch_code"]).toBe("BATCH001");
    });

    it("should handle missing fields as null", () => {
      const fields = ["id", "nonexistent_field"];
      const result = flattenStudentRecord(mockStudent, fields, false);

      expect(result.nonexistent_field).toBeNull();
    });

    it("should handle extra_fields that are already in fields list", () => {
      const fields = ["id", "certification_type"];
      const result = flattenStudentRecord(mockStudent, fields, true);

      // certification_type should come from extra_fields, not be duplicated
      expect(result.certification_type).toBe("TypeA");
      expect(result["extra_fields.certification_type"]).toBeUndefined();
    });
  });

  describe("exportToCSV", () => {
    it("should export data to CSV format", () => {
      const rows = [
        { id: "1", name: "Test", age: 25 },
        { id: "2", name: "User", age: 30 },
      ];

      const csv = exportToCSV(rows);
      expect(csv).toContain("id");
      expect(csv).toContain("name");
      expect(csv).toContain("age");
      expect(csv).toContain("Test");
      expect(csv).toContain("User");
    });

    it("should handle empty array", () => {
      const csv = exportToCSV([]);
      expect(csv).toBe("");
    });

    it("should format boolean values as Yes/No", () => {
      const rows = [{ id: "1", active: true, inactive: false }];
      const csv = exportToCSV(rows);
      expect(csv).toContain("Yes");
      expect(csv).toContain("No");
    });

    it("should format dates correctly", () => {
      const rows = [{ id: "1", date: new Date("2000-01-01") }];
      const csv = exportToCSV(rows);
      expect(csv).toContain("2000-01-01");
    });
  });

  describe("exportToJSON", () => {
    it("should export data to JSON format", () => {
      const rows = [
        { id: "1", name: "Test" },
        { id: "2", name: "User" },
      ];

      const json = exportToJSON(rows);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(rows);
      expect(parsed).toHaveLength(2);
    });

    it("should format JSON with indentation", () => {
      const rows = [{ id: "1", name: "Test" }];
      const json = exportToJSON(rows);

      // Should have newlines and spaces for indentation
      expect(json).toContain("\n");
      expect(json).toContain("  ");
    });
  });

  describe("exportToXLSX", () => {
    it("should export data to XLSX format", () => {
      const rows = [
        { id: "1", name: "Test" },
        { id: "2", name: "User" },
      ];

      const buffer = exportToXLSX(rows);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle empty array", () => {
      const buffer = exportToXLSX([]);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("getMimeType", () => {
    it("should return correct MIME type for CSV", () => {
      expect(getMimeType("csv")).toBe("text/csv");
    });

    it("should return correct MIME type for JSON", () => {
      expect(getMimeType("json")).toBe("application/json");
    });

    it("should return correct MIME type for XLSX", () => {
      expect(getMimeType("xlsx")).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });
  });

  describe("getFileExtension", () => {
    it("should return correct file extension", () => {
      expect(getFileExtension("csv")).toBe("csv");
      expect(getFileExtension("json")).toBe("json");
      expect(getFileExtension("xlsx")).toBe("xlsx");
    });
  });
});
