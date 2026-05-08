import { NextRequest, NextResponse } from "next/server";
import { getCostSummary } from "@/lib/cost-aggregator";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const summary = await getCostSummary(from, to);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
