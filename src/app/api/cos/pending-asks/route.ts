import { NextResponse } from "next/server";
import { cosPendingAsks } from "@/lib/cos";

export async function GET() {
  try {
    const asks = await cosPendingAsks();
    return NextResponse.json(asks);
  } catch (error) {
    return NextResponse.json(
      { error: "cos_unreachable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
