import { NextRequest, NextResponse } from "next/server";
import { getCostTimeseries } from "@/lib/cost-aggregator";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const granularity = (searchParams.get("granularity") as "day" | "week" | "month") ?? "day";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const data = await getCostTimeseries(granularity, from, to);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
