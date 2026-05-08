const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";

export const basePath =
  rawBasePath && rawBasePath !== "/" ? rawBasePath.replace(/\/$/, "") : "";

export function withBasePath(path: string): string;
export function withBasePath(path: null): null;
export function withBasePath(path: string | null): string | null;
export function withBasePath(path: string | null): string | null {
  if (!path || !basePath || !path.startsWith("/")) {
    return path;
  }

  if (path === basePath || path.startsWith(`${basePath}/`)) {
    return path;
  }

  return `${basePath}${path}`;
}
