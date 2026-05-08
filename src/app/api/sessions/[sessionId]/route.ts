import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { PATHS } from "@/lib/paths";
import { parseJsonlPaginated } from "@/lib/jsonl";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { searchParams } = request.nextUrl;
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  try {
    const filePath = path.join(PATHS.sessionsDir, `${sessionId}.jsonl`);
    const { records, total } = await parseJsonlPaginated(filePath, offset, limit);
    return NextResponse.json({ records, total, offset, limit });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
