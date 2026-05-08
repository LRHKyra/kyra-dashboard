/**
 * API proxy — forwards /api/pm/* requests to the Kyra PM backend.
 *
 * The PM backend runs on a configurable host (default 127.0.0.1:8000).
 * This proxy keeps the frontend decoupled from the PM API host.
 */

import { NextRequest, NextResponse } from "next/server";

const PM_BACKEND =
  process.env.PM_API_URL ?? "http://127.0.0.1:8000";

async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  // Strip the /api/pm prefix to get the real PM API path
  const pmPath = url.pathname.replace(/^\/api\/pm/, "");
  const target = `${PM_BACKEND}${pmPath}${url.search}`;

  try {
    const headers: Record<string, string> = {};
    const contentType = req.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;

    const res = await fetch(target, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD"
        ? await req.text()
        : undefined,
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "pm_backend_unreachable", detail: "Cannot connect to PM API" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
