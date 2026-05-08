const SENSITIVE_KEYS = /token|key|apikey|secret|password|webhook/i;

export function redactConfig(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactConfig(item));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key) && typeof value === "string" && value.length > 4) {
        result[key] = value.slice(0, 4) + "****";
      } else {
        result[key] = redactConfig(value);
      }
    }
    return result;
  }

  return obj;
}
