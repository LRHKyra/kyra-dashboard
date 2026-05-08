import { NextResponse } from "next/server";
import { getToolStats } from "@/lib/tool-aggregator";

export async function GET() {
  try {
    const stats = await getToolStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
