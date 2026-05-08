import { NextResponse } from "next/server";
import { exec } from "@/lib/ssh-client";

const SUPPRESS_PY = "/Users/lucas/clawd/tools/outreach/suppress.py";

interface SuppressionEntry {
  email: string;
  name: string;
  reason: string;
  ts: string;
}

interface SuppressResult {
  ok: boolean;
  entries?: SuppressionEntry[];
  email?: string;
  name?: string;
  reason?: string;
  ts?: string;
  removed?: boolean;
  error?: string;
}

function parseResult(raw: string): SuppressResult {
  try {
    return JSON.parse(raw.trim()) as SuppressResult;
  } catch {
    return { ok: false, error: `Unexpected output: ${raw.slice(0, 200)}` };
  }
}

// GET — list all suppressed entries
export async function GET() {
  try {
    const raw = await exec(`python3 ${SUPPRESS_PY} list`);
    const result = parseResult(raw);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result.entries ?? []);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

// POST — add an entry  { email, reason, name? }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; reason?: string; name?: string };
    const { email, reason, name = "" } = body;

    if (!email || !reason) {
      return NextResponse.json(
        { error: "email and reason are required" },
        { status: 400 }
      );
    }

    // Shell-escape the three string arguments
    const esc = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;
    const cmd = `python3 ${SUPPRESS_PY} add --email ${esc(email)} --reason ${esc(reason)} --name ${esc(name)}`;
    const raw = await exec(cmd);
    const result = parseResult(raw);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove an entry  { email }
export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { email?: string };
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const esc = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;
    const cmd = `python3 ${SUPPRESS_PY} remove --email ${esc(email)}`;
    const raw = await exec(cmd);
    const result = parseResult(raw);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
