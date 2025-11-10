import { NextRequest, NextResponse } from "next/server";
import { getFieldMetadata } from "@/lib/metadata/fieldMetadata";

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table") ?? undefined;
  const column = searchParams.get("column") ?? undefined;
  const includeCoreParam = searchParams.get("includeCore");

  const includeCore = includeCoreParam === null ? true : includeCoreParam !== "false";

  const result = getFieldMetadata({
    table,
    column,
    includeCore,
  });

  if (result.tables.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No metadata found for the requested filters",
        filters: {
          table,
          column,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    ...result,
  });
}
