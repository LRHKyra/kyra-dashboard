import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { readSettings, getDbPath, getRunsDir } from "@/lib/outreach-settings";

// Allow alphanumeric, hyphens, underscores — prevents path traversal
const RUN_ID_RE = /^[\w-]{1,80}$/;

function countJsonlLines(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf8");
  return content.split("\n").filter((l) => l.trim()).length;
}

interface RunRow {
  run_id: string;
  created_at: string;
  allow_spend: number;
  status: string;
}

interface StepRow {
  step: string;
  status: string;
  ts: string;
  message: string;
}

interface SpendRow {
  tool: string;
  total: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!RUN_ID_RE.test(runId)) {
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  }

  try {
    const settings = readSettings();
    const dbPath = getDbPath(settings);
    const runsDir = getRunsDir(settings);
    const runDir = path.join(runsDir, runId);

    if (!fs.existsSync(runDir)) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Campaign name from artifact
    let campaign_name: string | null = null;
    try {
      const configPath = path.join(runDir, "campaign_config.json");
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
          campaign_name?: string;
        };
        campaign_name = cfg.campaign_name ?? null;
      }
    } catch {
      /* ignore */
    }

    let run: RunRow | null = null;
    let steps: StepRow[] = [];
    let spend: SpendRow[] = [];

    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        run = db
          .prepare(
            "SELECT run_id, created_at, allow_spend, status FROM runs WHERE run_id = ?"
          )
          .get(runId) as RunRow | null;

        steps = db
          .prepare(
            "SELECT step, status, ts, message FROM step_status WHERE run_id = ? ORDER BY ts ASC"
          )
          .all(runId) as StepRow[];

        spend = db
          .prepare(
            "SELECT tool, SUM(amount) AS total FROM credit_ledger WHERE run_id = ? GROUP BY tool ORDER BY total DESC"
          )
          .all(runId) as SpendRow[];
      } finally {
        db.close();
      }
    }

    // Deduplicate steps — keep the latest entry per step name
    const stepMap = new Map<string, StepRow>();
    for (const s of steps) stepMap.set(s.step, s);
    const uniqueSteps = Array.from(stepMap.values());

    const counts = {
      leads: countJsonlLines(
        path.join(runDir, "prospecting", "leads_final.jsonl")
      ),
      researched: countJsonlLines(
        path.join(runDir, "research", "research.jsonl")
      ),
      approved: countJsonlLines(
        path.join(runDir, "qc", "emails_approved.jsonl")
      ),
      sequences: countJsonlLines(
        path.join(runDir, "copywriting", "sequences.jsonl")
      ),
    };

    return NextResponse.json({
      run_id: runId,
      campaign_name,
      created_at: run?.created_at ?? null,
      allow_spend: run ? !!run.allow_spend : false,
      status: run?.status ?? "unknown",
      steps: uniqueSteps,
      counts,
      spend,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
