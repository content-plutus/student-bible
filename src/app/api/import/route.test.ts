import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import { POST, GET } from "../route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/utils/csvParser");
jest.mock("@/lib/services/batchImportService");
jest.mock("@supabase/supabase-js");

const mockImportJob = {
  id: "job-123",
  status: "completed",
  total_records: 2,
  processed_records: 2,
  successful_records: 2,
  failed_records: 0,
  error_summary: [],
  inserted_student_ids: ["student-1", "student-2"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  completed_at: "2024-01-01T00:01:00Z",
  metadata: {
    sourceType: "json",
    batchSize: 100,
  },
};

const createMockRequest = (
  body?: unknown,
  headers?: Record<string, string>,
  searchParams?: Record<string, string>,
): NextRequest => {
  const url = new URL("http://localhost/api/import");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const requestInit: RequestInit = {
    method: "POST",
    headers: headers || {
      "content-type": "application/json",
      "X-Internal-API-Key": "test-key",
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

const createMockSupabaseClient = () => {
  const mockInsert = jest.fn().mockResolvedValue({
    data: { id: mockImportJob.id },
    error: null,
  });

  const mockSelect = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: mockImportJob,
        error: null,
      }),
    }),
  });

  return {
    from: jest.fn((table: string) => {
      if (table === "import_jobs") {
        return {
          insert: mockInsert,
          select: mockSelect,
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      return {
        insert: jest.fn().mockResolvedValue({
          data: [{ id: "student-1" }],
          error: null,
        }),
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "student-1" },
            error: null,
          }),
        }),
      };
    }),
  };
};

describe("POST /api/import", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should reject requests without API key", async () => {
      const request = createMockRequest({ data: [] }, { "content-type": "application/json" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Unauthorized");
    });
  });

  describe("JSON Import", () => {
    it("should import JSON array successfully", async () => {
      const { BatchImportService } = await import("@/lib/services/batchImportService");
      const mockService = {
        processBatchImport: jest.fn().mockResolvedValue({
          success: true,
          errors: [],
        }),
      };
      jest.mocked(BatchImportService).mockImplementation(() => mockService as never);

      const mockSupabase = createMockSupabaseClient();
      jest.doMock("@supabase/supabase-js", () => ({
        createClient: jest.fn().mockReturnValue(mockSupabase),
      }));

      const request = createMockRequest({
        data: [
          {
            phone_number: "9876543210",
            email: "test@example.com",
            first_name: "John",
            last_name: "Doe",
          },
        ],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBeDefined();
    });

    it("should accept array directly in request body", async () => {
      const { BatchImportService } = await import("@/lib/services/batchImportService");
      const mockService = {
        processBatchImport: jest.fn().mockResolvedValue({
          success: true,
          errors: [],
        }),
      };
      jest.mocked(BatchImportService).mockImplementation(() => mockService as never);

      const request = createMockRequest([
        {
          phone_number: "9876543210",
          email: "test@example.com",
          first_name: "John",
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject non-array data", async () => {
      const request = createMockRequest({ invalid: "data" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("array");
    });

    it("should reject empty array", async () => {
      const request = createMockRequest({ data: [] });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("No records");
    });
  });

  describe("CSV Import", () => {
    it("should import CSV file successfully", async () => {
      const { DynamicCsvParser } = await import("@/lib/utils/csvParser");
      jest.mocked(DynamicCsvParser).mockImplementation(
        () =>
          ({
            parseAndTransform: jest.fn().mockResolvedValue({
              records: [
                {
                  structuredFields: {
                    phone_number: "9876543210",
                    email: "test@example.com",
                    first_name: "John",
                  },
                  jsonbFields: {},
                },
              ],
              errors: [],
              unmappedColumns: [],
            }),
          }) as never,
      );

      const { BatchImportService } = await import("@/lib/services/batchImportService");
      const mockService = {
        processBatchImport: jest.fn().mockResolvedValue({
          success: true,
          errors: [],
        }),
      };
      jest.mocked(BatchImportService).mockImplementation(() => mockService as never);

      const formData = new FormData();
      const blob = new Blob(["phone_number,email,first_name\n9876543210,test@example.com,John"], {
        type: "text/csv",
      });
      formData.append("file", blob, "test.csv");

      const request = new NextRequest("http://localhost/api/import", {
        method: "POST",
        body: formData,
        headers: {
          "X-Internal-API-Key": "test-key",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject request without file", async () => {
      const formData = new FormData();

      const request = new NextRequest("http://localhost/api/import", {
        method: "POST",
        body: formData,
        headers: {
          "X-Internal-API-Key": "test-key",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("File is required");
    });
  });

  describe("Async Mode", () => {
    it("should return job ID immediately in async mode", async () => {
      const mockSupabase = createMockSupabaseClient();
      jest.doMock("@supabase/supabase-js", () => ({
        createClient: jest.fn().mockReturnValue(mockSupabase),
      }));

      const request = createMockRequest(
        {
          data: [
            {
              phone_number: "9876543210",
              email: "test@example.com",
              first_name: "John",
            },
          ],
        },
        { "content-type": "application/json", "X-Internal-API-Key": "test-key" },
        { async: "true" },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBeDefined();
      expect(data.status).toBe("pending");
      expect(data.message).toContain("check status");
    });
  });

  describe("Options", () => {
    it("should accept import options via query parameter", async () => {
      const { BatchImportService } = await import("@/lib/services/batchImportService");
      const mockService = {
        processBatchImport: jest.fn().mockResolvedValue({
          success: true,
          errors: [],
        }),
      };
      jest.mocked(BatchImportService).mockImplementation((supabase, options) => {
        expect(options.batchSize).toBe(50);
        expect(options.skipDuplicates).toBe(true);
        return mockService as never;
      });

      const request = createMockRequest(
        {
          data: [
            {
              phone_number: "9876543210",
              email: "test@example.com",
              first_name: "John",
            },
          ],
        },
        { "content-type": "application/json", "X-Internal-API-Key": "test-key" },
        { options: JSON.stringify({ batchSize: 50, skipDuplicates: true }) },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors", async () => {
      const request = createMockRequest({
        data: [
          {
            phone_number: "invalid",
            email: "not-an-email",
          },
        ],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBeDefined();
    });

    it("should handle service errors gracefully", async () => {
      const { BatchImportService } = await import("@/lib/services/batchImportService");
      jest.mocked(BatchImportService).mockImplementation(() => {
        return {
          processBatchImport: jest.fn().mockRejectedValue(new Error("Service error")),
        } as never;
      });

      const request = createMockRequest({
        data: [
          {
            phone_number: "9876543210",
            email: "test@example.com",
            first_name: "John",
          },
        ],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});

describe("GET /api/import", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return import job status", async () => {
    const mockSupabase = createMockSupabaseClient();
    jest.doMock("@supabase/supabase-js", () => ({
      createClient: jest.fn().mockReturnValue(mockSupabase),
    }));

    const request = new NextRequest("http://localhost/api/import?jobId=job-123", {
      method: "GET",
      headers: {
        "X-Internal-API-Key": "test-key",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobId).toBe("job-123");
    expect(data.status).toBeDefined();
  });

  it("should reject request without jobId", async () => {
    const request = new NextRequest("http://localhost/api/import", {
      method: "GET",
      headers: {
        "X-Internal-API-Key": "test-key",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("jobId");
  });

  it("should return 404 for non-existent job", async () => {
    const mockSupabase = createMockSupabaseClient();
    mockSupabase.from("import_jobs").select = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      }),
    });

    jest.doMock("@supabase/supabase-js", () => ({
      createClient: jest.fn().mockReturnValue(mockSupabase),
    }));

    const request = new NextRequest("http://localhost/api/import?jobId=non-existent", {
      method: "GET",
      headers: {
        "X-Internal-API-Key": "test-key",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain("not found");
  });
});
