import { NextRequest, NextResponse } from "next/server";
import { queryChunks } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filePath = searchParams.get("path") ?? undefined;

  try {
    const chunks = await queryChunks(filePath);
    return NextResponse.json(
      chunks.map((c) => ({
        id: c.id,
        path: c.path,
        source: c.source,
        startLine: c.start_line,
        endLine: c.end_line,
        text: c.text,
        updatedAt: c.updated_at,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
