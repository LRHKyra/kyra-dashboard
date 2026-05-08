import { NextResponse } from "next/server";
import { cosReviewQueue } from "@/lib/cos";

export async function GET() {
  try {
    const queue = await cosReviewQueue();
    return NextResponse.json(queue);
  } catch (error) {
    return NextResponse.json(
      { error: "cos_unreachable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
