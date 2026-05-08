import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readTrimmed(filePath: string): string | undefined {
  try {
    const value = readFileSync(filePath, "utf8").trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function readGitHead(): string | undefined {
  const gitDir = path.join(process.cwd(), ".git");
  const head = readTrimmed(path.join(gitDir, "HEAD"));

  if (!head) {
    return undefined;
  }

  if (!head.startsWith("ref: ")) {
    return head;
  }

  return readTrimmed(path.join(gitDir, head.slice("ref: ".length)));
}

export function GET() {
  const version =
    process.env.APP_VERSION ??
    process.env.NEXT_PUBLIC_APP_VERSION ??
    readTrimmed(path.join(process.cwd(), ".deployed-version")) ??
    readGitHead() ??
    "unknown";

  return NextResponse.json({
    version,
    deploymentMode: process.env.DEPLOYMENT_MODE ?? "local",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  });
}
