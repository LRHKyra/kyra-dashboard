import type { NextConfig } from "next";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
const basePath =
  rawBasePath && rawBasePath !== "/"
    ? rawBasePath.replace(/\/$/, "")
    : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["ssh2", "better-sqlite3"],
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
