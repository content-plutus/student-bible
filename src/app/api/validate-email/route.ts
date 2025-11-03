import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validators/studentValidator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, excludeStudentId } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { isUnique: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const formatResult = emailSchema.safeParse(email);
    if (!formatResult.success) {
      return NextResponse.json(
        {
          isUnique: false,
          error: formatResult.error.issues[0]?.message || "Invalid email format",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    let query = supabaseServer
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("email", normalizedEmail);

    if (excludeStudentId && typeof excludeStudentId === "string") {
      query = query.neq("id", excludeStudentId);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Database error checking email uniqueness:", error);
      return NextResponse.json(
        { isUnique: false, error: "Unable to verify email uniqueness" },
        { status: 500 },
      );
    }

    return NextResponse.json({ isUnique: (count ?? 0) === 0 });
  } catch (err) {
    console.error("Unexpected error in validate-email:", err);
    return NextResponse.json(
      { isUnique: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
