/**
 * Outreach settings storage.
 *
 * Settings JSON  — ~/.openclaw/outreach_settings.json  (chmod 600)
 * API key values — ~/.openclaw/kyra-outreach.env       (chmod 600)
 *
 * Key values are NEVER returned to the client; only { isSet, updatedAt } metadata is exposed.
 */

import fs from "fs";
import path from "path";
import os from "os";

const OPENCLAW_HOME =
  process.env.OPENCLAW_HOME || path.join(os.homedir(), ".openclaw");

export const SETTINGS_PATH = path.join(OPENCLAW_HOME, "outreach_settings.json");
export const ENV_PATH = path.join(OPENCLAW_HOME, "kyra-outreach.env");

const MANAGED_KEYS = ["ANTHROPIC_API_KEY", "SERP_API_KEY", "OPENAI_API_KEY"];

export interface KeyMeta {
  isSet: boolean;
  updatedAt: string | null;
}

export interface OutreachSettings {
  kyraOutreachRoot: string;
  dbPath: string;
  llmProvider: string;
  llmModel: string;
  keys: Record<string, KeyMeta>;
}

const DEFAULT_SETTINGS: OutreachSettings = {
  kyraOutreachRoot: path.join(os.homedir(), "kyra-outreach"),
  dbPath: "",
  llmProvider: "anthropic",
  llmModel: "claude-sonnet-4-6",
  keys: Object.fromEntries(
    MANAGED_KEYS.map((k) => [k, { isSet: false, updatedAt: null }])
  ),
};

export function readSettings(): OutreachSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<OutreachSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keys: {
        ...DEFAULT_SETTINGS.keys,
        ...(parsed.keys ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_SETTINGS.keys } };
  }
}

export function writeSettings(settings: OutreachSettings): void {
  fs.mkdirSync(OPENCLAW_HOME, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), {
    mode: 0o600,
  });
}

/** Read the env file and return key→value map. */
function readEnvFile(): Record<string, string> {
  try {
    const content = fs.readFileSync(ENV_PATH, "utf8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) result[match[1]] = match[2];
    }
    return result;
  } catch {
    return {};
  }
}

/** Write updates to the env file (creates/overwrites entries). */
export function updateEnvKeys(updates: Record<string, string | null>): void {
  fs.mkdirSync(OPENCLAW_HOME, { recursive: true });
  const current = readEnvFile();
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      delete current[key];
    } else {
      current[key] = value;
    }
  }
  const content =
    Object.entries(current)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";
  fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });
}

/** Return isSet/updatedAt for each managed key, cross-referencing the env file. */
export function checkEnvKeys(settings: OutreachSettings): Record<string, KeyMeta> {
  const current = readEnvFile();
  const result: Record<string, KeyMeta> = {};
  for (const name of MANAGED_KEYS) {
    result[name] = {
      isSet: !!current[name],
      updatedAt: settings.keys[name]?.updatedAt ?? null,
    };
  }
  return result;
}

export function getDbPath(settings: OutreachSettings): string {
  if (settings.dbPath) return settings.dbPath;
  return path.join(settings.kyraOutreachRoot, "data", "state.db");
}

export function getRunsDir(settings: OutreachSettings): string {
  return path.join(settings.kyraOutreachRoot, "runs");
}
