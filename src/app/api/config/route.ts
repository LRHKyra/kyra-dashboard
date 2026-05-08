import { NextResponse } from "next/server";
import { PATHS } from "@/lib/paths";
import { redactConfig } from "@/lib/redact";
import * as rfs from "@/lib/remote-fs";

export async function GET() {
  try {
    const raw = await rfs.readJSON(PATHS.config);
    if (!raw) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const redacted = redactConfig(raw);
    return NextResponse.json(redacted);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
