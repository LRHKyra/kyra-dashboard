import { NextResponse } from "next/server";
import * as rfs from "@/lib/remote-fs";
import { PATHS } from "@/lib/paths";
import path from "path";
import type { PlaybookDigest } from "@/lib/types";

async function loadDigestsFrom(
  dir: string,
  type: "nightly" | "weekly"
): Promise<PlaybookDigest[]> {
  try {
    const files = await rfs.readdir(dir);
    const mdFiles = files
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 14);

    const digests = await rfs.parallel(
      mdFiles,
      async (file) => {
        const content = await rfs.readFile(path.join(dir, file));
        const date = file.replace(".md", "");
        return { date, type, content } as PlaybookDigest;
      },
      5
    );

    return digests;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [nightly, weekly] = await Promise.all([
      loadDigestsFrom(PATHS.playbookDigestsNightly, "nightly"),
      loadDigestsFrom(PATHS.playbookDigestsWeekly, "weekly"),
    ]);

    return NextResponse.json({ nightly, weekly });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
