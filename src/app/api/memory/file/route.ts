import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import * as rfs from "@/lib/remote-fs";

// Relative paths in the DB are relative to ~/clawd
function resolvePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return path.normalize(filePath);
  return path.normalize(path.join(os.homedir(), "clawd", filePath));
}

function isAllowedPath(filePath: string): boolean {
  if (!filePath || !filePath.endsWith(".md")) return false;
  const resolved = resolvePath(filePath);
  return resolved.startsWith(os.homedir() + path.sep) && !resolved.includes("..");
}

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath || !isAllowedPath(filePath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    const content = await rfs.readFile(resolvePath(filePath));
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { path: filePath, content } = await request.json();
  if (!filePath || !isAllowedPath(filePath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (typeof content !== "string") {
    return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
  }
  try {
    await rfs.writeFile(resolvePath(filePath), content);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath || !isAllowedPath(filePath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    await rfs.deleteFile(resolvePath(filePath));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
