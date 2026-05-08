import { NextRequest, NextResponse } from "next/server";
import { cosIntake, cosListAssignments } from "@/lib/cos";

export async function GET() {
  try {
    const assignments = await cosListAssignments();
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json(
      { error: "cos_unreachable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const result = await cosIntake(body.text);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "cos_intake_failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
