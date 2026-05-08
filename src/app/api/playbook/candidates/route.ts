import { NextResponse } from "next/server";
import * as rfs from "@/lib/remote-fs";
import { PATHS } from "@/lib/paths";
import path from "path";
import type { PlaybookCandidate } from "@/lib/types";

const SCORE_DIMENSIONS = [
  "source_quality",
  "specificity",
  "repeatability",
  "durability",
  "compatibility",
  "expected_quality_gain",
  "expected_speed_gain",
  "expected_cost_impact",
  "implementation_effort",
  "instruction_bloat_risk",
];

function parseCandidate(filename: string, content: string): PlaybookCandidate {
  const id = filename.replace(".md", "");

  const titleMatch = content.match(/^# Candidate:\s*\S+\s*—\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : id;

  const extractSection = (name: string): string => {
    const pattern = new RegExp(
      `## ${name}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
      "i"
    );
    const match = content.match(pattern);
    return match ? match[1].trim() : "";
  };

  const summary = extractSection("Summary");
  const claim = extractSection("Claim");

  const sourcesRaw = extractSection("Sources");
  const sources = sourcesRaw
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  const tierMatch = content.match(/Tier:\s*(\d)/);
  const sourceTier = tierMatch ? parseInt(tierMatch[1], 10) : 0;

  const scopeSection = extractSection("Scope classification");
  const scopeMatch = scopeSection.match(/\[x\]\s*(.+)/i);
  const scope = scopeMatch ? scopeMatch[1].trim() : "unclassified";

  const statusSection = extractSection("Promotion status");
  const status = statusSection.split("\n")[0]?.trim() || "unknown";

  const scoresSection = extractSection("Scores");
  const scores: Record<string, number> = {};
  for (const dim of SCORE_DIMENSIONS) {
    const m = scoresSection.match(new RegExp(`${dim}:\\s*(\\d+)`));
    if (m) scores[dim] = parseInt(m[1], 10);
  }

  const values = Object.values(scores);
  const averageScore =
    values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
        10
      : null;

  return {
    id,
    title,
    summary,
    claim,
    sources,
    sourceTier,
    scope,
    status,
    scores,
    averageScore,
    file: filename,
  };
}

async function loadCandidatesFrom(
  dir: string
): Promise<PlaybookCandidate[]> {
  try {
    const files = await rfs.readdir(dir);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort().reverse();

    const candidates = await rfs.parallel(
      mdFiles,
      async (file) => {
        const content = await rfs.readFile(path.join(dir, file));
        return parseCandidate(file, content);
      },
      5
    );

    return candidates;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [queued, approved, rejected] = await Promise.all([
      loadCandidatesFrom(PATHS.playbookCandidatesQueue),
      loadCandidatesFrom(PATHS.playbookCandidatesApproved),
      loadCandidatesFrom(PATHS.playbookCandidatesRejected),
    ]);

    return NextResponse.json({
      queued,
      approved,
      rejected,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
