import { NextResponse } from "next/server";
import { getCostByModel } from "@/lib/cost-aggregator";

export async function GET() {
  try {
    const data = await getCostByModel();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
