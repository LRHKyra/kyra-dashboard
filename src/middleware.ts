import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isCloud = process.env.DEPLOYMENT_MODE === "cloud";
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath = rawBasePath && rawBasePath !== "/" ? rawBasePath.replace(/\/$/, "") : "";

/** Prefixes / paths that are always allowed (static assets, Next internals). */
const ALWAYS_ALLOWED = ["/_next/", "/favicon.ico", "/icon.svg"];

/** Routes accessible in cloud mode. */
const CLOUD_ALLOWED = ["/pipeline", "/api/hubspot/pipeline"];

function stripBasePath(pathname: string): string {
  if (!basePath || pathname === basePath) {
    return pathname === basePath ? "/" : pathname;
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}

export function middleware(request: NextRequest) {
  // Local mode — no restrictions
  if (!isCloud) {
    return NextResponse.next();
  }

  const pathname = stripBasePath(request.nextUrl.pathname);

  // Always allow static / internal routes
  if (ALWAYS_ALLOWED.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow cloud-permitted routes
  if (CLOUD_ALLOWED.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Everything else → redirect to /pipeline
  const url = request.nextUrl.clone();
  url.pathname = `${basePath}/pipeline`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
