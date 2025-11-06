import { describe, expect, it } from "@jest/globals";
import { validateExtraFieldsWithBatchCode } from "./schemaEvolution";

describe("schemaEvolution", () => {
  describe("validateExtraFieldsWithBatchCode", () => {
    it("returns success for valid extra fields", () => {
      const result = validateExtraFieldsWithBatchCode(
        {
          batch_code: "ACCA_2024_Batch_1",
          certification_type: "ACCA",
        },
        "ACCA",
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        batch_code: "ACCA_2024_Batch_1",
        certification_type: "ACCA",
      });
    });

    it("returns error when extra field values fail schema validation", () => {
      const result = validateExtraFieldsWithBatchCode(
        {
          guardian_email: "invalid-email",
        },
        null,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Please enter a valid email address");
    });

    it("upgrades legacy camelCase keys and values", () => {
      const result = validateExtraFieldsWithBatchCode(
        {
          mentorName: "Legacy Mentor",
          certificationType: "USCMA",
        },
        null,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        mentor_name: "Legacy Mentor",
        certification_type: "US CMA",
      });
    });
  });
});
