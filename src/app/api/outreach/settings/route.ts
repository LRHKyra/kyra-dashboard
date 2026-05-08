import { NextRequest, NextResponse } from "next/server";
import {
  readSettings,
  writeSettings,
  updateEnvKeys,
  checkEnvKeys,
} from "@/lib/outreach-settings";

export async function GET() {
  try {
    const settings = readSettings();
    // Reconcile isSet against the actual env file — never return key values.
    settings.keys = checkEnvKeys(settings);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = readSettings();

    // Non-key fields
    if (typeof body.kyraOutreachRoot === "string")
      settings.kyraOutreachRoot = body.kyraOutreachRoot;
    if (typeof body.dbPath === "string") settings.dbPath = body.dbPath;
    if (typeof body.llmProvider === "string")
      settings.llmProvider = body.llmProvider;
    if (typeof body.llmModel === "string") settings.llmModel = body.llmModel;

    // Key updates — write values to env file only, never store them in JSON
    if (body.keys && typeof body.keys === "object") {
      const envUpdates: Record<string, string | null> = {};
      const now = new Date().toISOString();
      for (const [key, value] of Object.entries(body.keys)) {
        if (typeof value === "string" || value === null) {
          envUpdates[key] = value as string | null;
          settings.keys[key] = {
            isSet: !!value,
            updatedAt: value
              ? now
              : (settings.keys[key]?.updatedAt ?? null),
          };
        }
      }
      updateEnvKeys(envUpdates);
    }

    writeSettings(settings);
    // Return reconciled metadata
    settings.keys = checkEnvKeys(settings);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
