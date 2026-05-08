import { NextResponse } from "next/server";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

export async function GET() {
  try {
    const raw = await rfs.readJSON<{ jobs?: unknown[] }>(PATHS.cronJobs);
    if (!raw) {
      return NextResponse.json([]);
    }

    return NextResponse.json(raw.jobs || []);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
