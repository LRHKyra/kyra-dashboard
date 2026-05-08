import Database from "better-sqlite3";
import { PATHS } from "./paths";
import * as rfs from "./remote-fs";
import path from "path";
import os from "os";
import fs from "fs";

const LOCAL_DB_PATH = path.join(os.tmpdir(), "openclaw-memory.sqlite");
const CACHE_TTL = 120_000; // 2 minutes

let db: Database.Database | null = null;
let lastDownload = 0;
let lastRemoteMtime = 0;

async function ensureDb(): Promise<Database.Database | null> {
  const now = Date.now();

  // If cache is still fresh, reuse
  if (db && now - lastDownload < CACHE_TTL) return db;

  // Check remote mtime to skip unnecessary re-downloads
  try {
    const remoteStat = await rfs.stat(PATHS.memoryDb);
    const remoteMtime = remoteStat.mtime * 1000; // SFTP returns seconds

    if (db && remoteMtime === lastRemoteMtime) {
      lastDownload = now; // reset TTL since we checked
      return db;
    }

    // Download the file
    await rfs.downloadFile(PATHS.memoryDb, LOCAL_DB_PATH);
    lastRemoteMtime = remoteMtime;
    lastDownload = now;

    // Close old connection
    if (db) {
      try { db.close(); } catch { /* ignore */ }
    }

    db = new Database(LOCAL_DB_PATH, { readonly: true, fileMustExist: true });
    db.pragma("journal_mode = OFF");
    db.pragma("query_only = ON");
    return db;
  } catch {
    return null;
  }
}

export async function getDb(): Promise<Database.Database | null> {
  return ensureDb();
}

export async function queryFiles(): Promise<Array<{ path: string; source: string; size: number; hash: string; mtime: number }>> {
  const conn = await ensureDb();
  if (!conn) return [];
  try {
    return conn.prepare("SELECT path, source, size, hash, mtime FROM files").all() as Array<{
      path: string; source: string; size: number; hash: string; mtime: number;
    }>;
  } catch {
    return [];
  }
}

export async function queryChunks(filePath?: string): Promise<Array<{
  id: string; path: string; source: string;
  start_line: number; end_line: number; text: string; updated_at: number;
}>> {
  const conn = await ensureDb();
  if (!conn) return [];
  try {
    if (filePath) {
      return conn
        .prepare("SELECT id, path, source, start_line, end_line, text, updated_at FROM chunks WHERE path = ?")
        .all(filePath) as Array<{
          id: string; path: string; source: string;
          start_line: number; end_line: number; text: string; updated_at: number;
        }>;
    }
    return conn
      .prepare("SELECT id, path, source, start_line, end_line, text, updated_at FROM chunks")
      .all() as Array<{
        id: string; path: string; source: string;
        start_line: number; end_line: number; text: string; updated_at: number;
      }>;
  } catch {
    return [];
  }
}

export async function searchChunks(query: string): Promise<Array<{
  id: string; path: string; text: string; rank: number;
}>> {
  const conn = await ensureDb();
  if (!conn) return [];
  try {
    return conn
      .prepare(
        `SELECT c.id, c.path, c.text, fts.rank
         FROM chunks_fts fts
         JOIN chunks c ON c.id = fts.id
         WHERE chunks_fts MATCH ?
         ORDER BY fts.rank
         LIMIT 50`
      )
      .all(query) as Array<{ id: string; path: string; text: string; rank: number }>;
  } catch {
    return [];
  }
}
