import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { readSettings, getDbPath, getRunsDir } from "@/lib/outreach-settings";

interface RunRow {
  run_id: string;
  created_at: string;
  allow_spend: number;
  status: string;
}

export async function GET() {
  try {
    const settings = readSettings();
    const dbPath = getDbPath(settings);
    const runsDir = getRunsDir(settings);

    let rows: RunRow[] = [];
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        rows = db
          .prepare(
            "SELECT run_id, created_at, allow_spend, status FROM runs ORDER BY created_at DESC LIMIT 50"
          )
          .all() as RunRow[];
      } finally {
        db.close();
      }
    }

    const runs = rows.map((row) => {
      let campaign_name: string | null = null;
      try {
        const configPath = path.join(runsDir, row.run_id, "campaign_config.json");
        if (fs.existsSync(configPath)) {
          const cfg = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
            campaign_name?: string;
          };
          campaign_name = cfg.campaign_name ?? null;
        }
      } catch {
        /* ignore — config may not exist for all runs */
      }
      return {
        run_id: row.run_id,
        created_at: row.created_at,
        allow_spend: !!row.allow_spend,
        status: row.status,
        campaign_name,
      };
    });

    return NextResponse.json(runs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
