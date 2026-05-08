import { NextRequest, NextResponse } from "next/server";
import { cosWeeklyDigest } from "@/lib/cos";

export async function GET(req: NextRequest) {
  try {
    const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10);
    const markdown = await cosWeeklyDigest(days);
    return NextResponse.json({ markdown });
  } catch (error) {
    return NextResponse.json(
      { error: "cos_unreachable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
