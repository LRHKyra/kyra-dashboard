// ---------------------------------------------------------------------------
// Deployment mode helpers
// ---------------------------------------------------------------------------

export function isCloudMode(): boolean {
  return process.env.DEPLOYMENT_MODE === "cloud";
}

/**
 * Nav items visible in cloud mode. Each entry matches a `href` from the
 * sidebar nav arrays so the Sidebar can filter with a simple `.includes()`.
 */
export const CLOUD_NAV_HREFS = ["/pipeline"] as const;

/**
 * Routes the middleware should allow through in cloud mode.
 * Everything else redirects to /pipeline.
 */
export const CLOUD_ALLOWED_ROUTES = [
  "/pipeline",
  "/api/hubspot/pipeline",
] as const;

/**
 * Read the connecting user's email from the reverse-proxy header.
 * AWS ALB + OIDC sets `x-amzn-oidc-identity`; a generic proxy may use
 * `x-forwarded-email`. Returns `undefined` when no header is present.
 */
export function getUserEmail(headers: Headers): string | undefined {
  return (
    headers.get("x-amzn-oidc-identity") ??
    headers.get("x-forwarded-email") ??
    undefined
  );
}
