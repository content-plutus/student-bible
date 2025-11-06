import { DynamicCsvParser, createCsvParser } from "../csvParser";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const TEST_DIR = join(__dirname, "test-data");

beforeAll(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    const files = [
      "test-students.csv",
      "test-students-semicolon.csv",
      "test-students-tab.csv",
      "test-students-utf8-bom.csv",
      "test-students-unmapped.csv",
      "test-students-invalid.csv",
    ];
    files.forEach((file) => {
      const filePath = join(TEST_DIR, file);
      try {
        unlinkSync(filePath);
      } catch {}
    });
  }
});

describe("DynamicCsvParser", () => {
  describe("Constructor and Factory", () => {
    it("should create parser with default options", () => {
      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      expect(parser).toBeInstanceOf(DynamicCsvParser);
    });

    it("should create parser with custom options", () => {
      const parser = new DynamicCsvParser({
        targetTable: "students",
        batchSize: 1000,
        encoding: "utf-8",
        fieldMappingRules: { firstName: "first_name" },
      });

      expect(parser).toBeInstanceOf(DynamicCsvParser);
    });

    it("should create parser using factory function", () => {
      const parser = createCsvParser({
        targetTable: "students",
      });

      expect(parser).toBeInstanceOf(DynamicCsvParser);
    });
  });

  describe("CSV Parsing", () => {
    it("should parse CSV with comma delimiter", async () => {
      const csvContent = `phone_number,email,first_name,last_name
9876543210,test1@example.com,John,Doe
9876543211,test2@example.com,Jane,Smith`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records.length).toBe(2);
      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
      expect(result.records[0].structuredFields.email).toBe("test1@example.com");
      expect(result.records[0].structuredFields.first_name).toBe("John");
      expect(result.records[0].structuredFields.last_name).toBe("Doe");
    });

    it("should parse CSV with semicolon delimiter", async () => {
      const csvContent = `phone_number;email;first_name;last_name
9876543210;test1@example.com;John;Doe
9876543211;test2@example.com;Jane;Smith`;

      const filePath = join(TEST_DIR, "test-students-semicolon.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records.length).toBe(2);
      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
    });

    it("should parse CSV with tab delimiter", async () => {
      const csvContent = `phone_number\temail\tfirst_name\tlast_name
9876543210\ttest1@example.com\tJohn\tDoe
9876543211\ttest2@example.com\tJane\tSmith`;

      const filePath = join(TEST_DIR, "test-students-tab.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records.length).toBe(2);
      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
    });

    it("should handle UTF-8 BOM", async () => {
      const csvContent = `phone_number,email,first_name,last_name
9876543210,test1@example.com,John,Doe`;

      const filePath = join(TEST_DIR, "test-students-utf8-bom.csv");
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const content = Buffer.concat([bom, Buffer.from(csvContent, "utf-8")]);
      writeFileSync(filePath, content);

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records.length).toBe(1);
      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
    });
  });

  describe("Column Mapping", () => {
    it("should map known columns to structured fields", async () => {
      const csvContent = `phone_number,email,first_name,last_name,gender
9876543210,test@example.com,John,Doe,Male`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
      expect(result.records[0].structuredFields.email).toBe("test@example.com");
      expect(result.records[0].structuredFields.first_name).toBe("John");
      expect(result.records[0].structuredFields.gender).toBe("Male");
    });

    it("should route unmapped columns to JSONB fields", async () => {
      const csvContent = `phone_number,email,first_name,custom_field1,custom_field2
9876543210,test@example.com,John,value1,value2`;

      const filePath = join(TEST_DIR, "test-students-unmapped.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
      expect(result.records[0].jsonbFields.custom_field1).toBe("value1");
      expect(result.records[0].jsonbFields.custom_field2).toBe("value2");
      expect(result.unmappedColumns).toContain("custom_field1");
      expect(result.unmappedColumns).toContain("custom_field2");
    });

    it("should apply custom field mapping rules", async () => {
      const csvContent = `phoneNumber,emailAddress,firstName
9876543210,test@example.com,John`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
        fieldMappingRules: {
          phoneNumber: "phone_number",
          emailAddress: "email",
          firstName: "first_name",
        },
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
      expect(result.records[0].structuredFields.email).toBe("test@example.com");
      expect(result.records[0].structuredFields.first_name).toBe("John");
    });

    it("should normalize column names", async () => {
      const csvContent = `Phone Number,Email Address,First Name
9876543210,test@example.com,John`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
      expect(result.records[0].structuredFields.email).toBe("test@example.com");
      expect(result.records[0].structuredFields.first_name).toBe("John");
    });
  });

  describe("Validation", () => {
    it("should validate phone numbers", async () => {
      const csvContent = `phone_number,email,first_name
1234567890,test@example.com,John
9876543210,test2@example.com,Jane`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].column).toBe("phone_number");
      expect(result.errors[0].message).toContain("Invalid phone number");
      expect(result.records.length).toBe(1);
    });

    it("should validate email addresses", async () => {
      const csvContent = `phone_number,email,first_name
9876543210,invalid-email,John
9876543211,test@example.com,Jane`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].column).toBe("email");
      expect(result.errors[0].message).toContain("Invalid email");
      expect(result.records.length).toBe(1);
    });

    it("should validate AADHAR numbers", async () => {
      const csvContent = `phone_number,email,aadhar_number
9876543210,test@example.com,12345678901
9876543211,test2@example.com,234123412346`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors.length).toBeGreaterThan(0);
      const aadharError = result.errors.find((e) => e.column === "aadhar_number");
      expect(aadharError).toBeDefined();
    });

    it("should validate gender values", async () => {
      const csvContent = `phone_number,email,gender
9876543210,test@example.com,InvalidGender
9876543211,test2@example.com,Male`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].column).toBe("gender");
      expect(result.errors[0].message).toContain("Invalid gender");
      expect(result.records.length).toBe(1);
    });

    it("should validate date of birth", async () => {
      const csvContent = `phone_number,email,date_of_birth
9876543210,test@example.com,1940-01-01
9876543211,test2@example.com,1995-05-15`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].column).toBe("date_of_birth");
      expect(result.errors[0].message).toContain("between 1950 and 2010");
      expect(result.records.length).toBe(1);
    });

    it("should validate guardian phone is different from student phone", async () => {
      const csvContent = `phone_number,email,guardian_phone
9876543210,test@example.com,9876543210
9876543211,test2@example.com,9876543212`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].column).toBe("guardian_phone");
      expect(result.errors[0].message).toContain("different from student phone");
      expect(result.records.length).toBe(1);
    });
  });

  describe("Batch Processing", () => {
    it("should process records in batches", async () => {
      const rows = [];
      for (let i = 0; i < 1500; i++) {
        rows.push(`987654${String(i).padStart(4, "0")},test${i}@example.com,User${i}`);
      }
      const csvContent = `phone_number,email,first_name\n${rows.join("\n")}`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
        batchSize: 500,
      });

      const result = await parser.parse(filePath);

      expect(result.batches.length).toBe(3);
      expect(result.batches[0].totalRows).toBe(500);
      expect(result.batches[1].totalRows).toBe(500);
      expect(result.batches[2].totalRows).toBe(500);
    });

    it("should handle custom batch sizes", async () => {
      const rows = [];
      for (let i = 0; i < 250; i++) {
        rows.push(`987654${String(i).padStart(4, "0")},test${i}@example.com,User${i}`);
      }
      const csvContent = `phone_number,email,first_name\n${rows.join("\n")}`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
        batchSize: 100,
      });

      const result = await parser.parse(filePath);

      expect(result.batches.length).toBe(3);
      expect(result.batches[0].totalRows).toBe(100);
      expect(result.batches[1].totalRows).toBe(100);
      expect(result.batches[2].totalRows).toBe(50);
    });
  });

  describe("JSONB Column Routing", () => {
    it("should route to correct JSONB column for students table", async () => {
      const csvContent = `phone_number,email,custom_field
9876543210,test@example.com,custom_value`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].jsonbFields.custom_field).toBe("custom_value");
    });

    it("should route to correct JSONB column for student_addresses table", async () => {
      const csvContent = `address_line1,city,postal_code,custom_field
123 Main St,Mumbai,400001,custom_value`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "student_addresses",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].jsonbFields.custom_field).toBe("custom_value");
    });

    it("should use custom JSONB column when specified", async () => {
      const csvContent = `phone_number,email,custom_field
9876543210,test@example.com,custom_value`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
        jsonbColumn: "metadata",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].jsonbFields.custom_field).toBe("custom_value");
    });
  });

  describe("Error Reporting", () => {
    it("should report errors with row numbers", async () => {
      const csvContent = `phone_number,email
1234567890,test@example.com
9876543210,invalid-email
9876543211,test2@example.com`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors.length).toBeGreaterThan(0);
      const phoneError = result.errors.find((e) => e.column === "phone_number");
      const emailError = result.errors.find((e) => e.column === "email");

      expect(phoneError?.row).toBe(2);
      expect(emailError?.row).toBe(3);
    });

    it("should report column names in errors", async () => {
      const csvContent = `phone_number,email,gender
9876543210,test@example.com,InvalidGender`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors[0].column).toBe("gender");
      expect(result.errors[0].message).toBeDefined();
    });

    it("should include error values in error reports", async () => {
      const csvContent = `phone_number,email
1234567890,test@example.com`;

      const filePath = join(TEST_DIR, "test-students-invalid.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.errors[0].value).toBe("1234567890");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty CSV file", async () => {
      const csvContent = `phone_number,email,first_name`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it("should skip empty rows", async () => {
      const csvContent = `phone_number,email,first_name
9876543210,test@example.com,John

9876543211,test2@example.com,Jane`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records.length).toBe(2);
    });

    it("should trim whitespace from values", async () => {
      const csvContent = `phone_number,email,first_name
  9876543210  ,  test@example.com  ,  John  `;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records[0].structuredFields.phone_number).toBe("9876543210");
      expect(result.records[0].structuredFields.email).toBe("test@example.com");
      expect(result.records[0].structuredFields.first_name).toBe("John");
    });

    it("should handle missing optional fields", async () => {
      const csvContent = `phone_number,email,first_name,guardian_phone
9876543210,test@example.com,John,
9876543211,test2@example.com,Jane,9876543212`;

      const filePath = join(TEST_DIR, "test-students.csv");
      writeFileSync(filePath, csvContent, "utf-8");

      const parser = new DynamicCsvParser({
        targetTable: "students",
      });

      const result = await parser.parseAndTransform(filePath);

      expect(result.records.length).toBe(2);
      expect(result.records[0].structuredFields.guardian_phone).toBeUndefined();
      expect(result.records[1].structuredFields.guardian_phone).toBe("9876543212");
    });
  });
});
