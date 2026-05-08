import { NextResponse } from "next/server";
import path from "path";
import { queryFiles, queryChunks } from "@/lib/db";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

export async function GET() {
  try {
    // Files from SQLite
    const dbFiles = await queryFiles();
    const chunkCounts = new Map<string, number>();
    const allChunks = await queryChunks();
    for (const chunk of allChunks) {
      chunkCounts.set(chunk.path, (chunkCounts.get(chunk.path) || 0) + 1);
    }

    const files = dbFiles.map((f) => ({
      path: f.path,
      source: f.source,
      size: f.size,
      chunkCount: chunkCounts.get(f.path) || 0,
    }));

    // Also list workspace markdown files
    if (await rfs.exists(PATHS.memoryDir)) {
      const mdFiles = (await rfs.readdir(PATHS.memoryDir)).filter((f) => f.endsWith(".md"));
      const dbPaths = new Set(dbFiles.map((f) => f.path));
      for (const file of mdFiles) {
        const fullPath = path.join(PATHS.memoryDir, file);
        if (!dbPaths.has(fullPath)) {
          const s = await rfs.stat(fullPath);
          files.push({
            path: fullPath,
            source: "workspace",
            size: s.size,
            chunkCount: 0,
          });
        }
      }
    }

    // Include MEMORY.md
    if (await rfs.exists(PATHS.memoryMd)) {
      const dbPaths = new Set(files.map((f) => f.path));
      if (!dbPaths.has(PATHS.memoryMd)) {
        const s = await rfs.stat(PATHS.memoryMd);
        files.push({
          path: PATHS.memoryMd,
          source: "workspace",
          size: s.size,
          chunkCount: 0,
        });
      }
    }

    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
