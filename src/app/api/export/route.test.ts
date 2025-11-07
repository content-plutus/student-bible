/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/export/route";
import { createServerClient } from "@/lib/supabase/server";

// Mock dependencies
jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("@/lib/utils/exportFormatters", () => ({
  exportToCSV: jest.fn((rows) => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    return [
      headers,
      ...rows.map((r: Record<string, unknown>) => headers.map((h) => String(r[h]))),
    ].join("\n");
  }),
  exportToJSON: jest.fn((rows) => JSON.stringify(rows, null, 2)),
  exportToXLSX: jest.fn(() => Buffer.from("xlsx-data")),
  flattenStudentRecord: jest.fn((student, fields) => {
    const row: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in student) {
        row[field] = student[field];
      } else {
        row[field] = null;
      }
    }
    return row;
  }),
  getMimeType: jest.fn((format) => {
    const types: Record<string, string> = {
      csv: "text/csv",
      json: "application/json",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    return types[format];
  }),
  getFileExtension: jest.fn((format) => format),
}));

describe("Export API", () => {
  const mockStudents = [
    {
      id: "123",
      phone_number: "9876543210",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      date_of_birth: "2000-01-01",
      enrollment_status: "Active",
      gender: "Male",
      created_at: "2024-01-01T00:00:00Z",
      extra_fields: { certification_type: "TypeA" },
    },
  ];

  const mockSupabaseQuery = {
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: mockStudents,
      error: null,
    }),
  };

  const mockSupabase = {
    from: jest.fn(() => ({
      select: jest.fn(() => mockSupabaseQuery),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createServerClient).mockReturnValue(mockSupabase as any);
  });

  describe("POST /api/export", () => {
    it("should export students as CSV", async () => {
      const requestBody = {
        format: "csv",
        fields: ["id", "phone_number", "email"],
        filters: {},
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/csv");
      expect(response.headers.get("Content-Disposition")).toContain(".csv");
    });

    it("should export students as JSON", async () => {
      const requestBody = {
        format: "json",
        fields: ["id", "phone_number", "email"],
        filters: {},
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should export students as XLSX", async () => {
      const requestBody = {
        format: "xlsx",
        fields: ["id", "phone_number", "email"],
        filters: {},
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });

    it("should apply enrollment_status filter", async () => {
      const requestBody = {
        format: "csv",
        fields: ["id", "phone_number"],
        filters: {
          enrollment_status: "Active",
        },
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith("enrollment_status", "Active");
    });

    it("should apply certification_type filter from extra_fields", async () => {
      const requestBody = {
        format: "csv",
        fields: ["id", "phone_number"],
        filters: {
          certification_type: "TypeA",
        },
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith(
        "extra_fields->>certification_type",
        "TypeA",
      );
    });

    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const requestBody = {
        format: "csv",
        fields: ["id", "phone_number"],
        filters: {},
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body.error).toContain("Unauthorized");
    });

    it("should return 404 if no students found", async () => {
      mockSupabaseQuery.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const requestBody = {
        format: "csv",
        fields: ["id", "phone_number"],
        filters: {},
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const body = await response.json();
      expect(response.status).toBe(404);
      expect(body.error).toContain("No students found");
    });

    it("should apply age filters correctly using SQL date_of_birth filters", async () => {
      const requestBody = {
        format: "csv",
        fields: ["id", "phone_number"],
        filters: {
          min_age: 20,
          max_age: 30,
        },
        include_extra_fields: false,
        limit: 1000,
        offset: 0,
      };

      const request = new NextRequest("http://localhost/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      // Verify that date_of_birth filters are applied in SQL (before pagination)
      expect(mockSupabaseQuery.lte).toHaveBeenCalled(); // For min_age (maxDate)
      expect(mockSupabaseQuery.gte).toHaveBeenCalled(); // For max_age (minDate)
      expect(mockSupabaseQuery.not).toHaveBeenCalledWith("date_of_birth", "is", null);
      // Verify pagination is still applied
      expect(mockSupabaseQuery.range).toHaveBeenCalled();
    });
  });

  describe("GET /api/export", () => {
    it("should handle GET request with query parameters", async () => {
      const request = new NextRequest(
        "http://localhost/api/export?format=csv&enrollment_status=Active&limit=100&fields=id,phone_number&include_extra_fields=false",
        {
          method: "GET",
          headers: {
            
          },
        },
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/csv");
    });

    it("should use default values for missing query parameters", async () => {
      const request = new NextRequest("http://localhost/api/export?format=json", {
        method: "GET",
        headers: {
          
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });
});
