import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
import { randomUUID } from "crypto";

const home = process.env.OPENCLAW_HOME || path.join(os.homedir(), ".openclaw");
const LOCAL_DB_PATH = path.join(home, "dashboard.sqlite");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });

  db = new Database(LOCAL_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      assignee TEXT NOT NULL DEFAULT 'me',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      idea TEXT,
      script TEXT,
      thumbnail_url TEXT,
      stage TEXT NOT NULL DEFAULT 'idea',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  return db;
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  assignee: "me" | "claude";
  created_at: number;
  updated_at: number;
}

export function getTasks(): Task[] {
  return getDb()
    .prepare("SELECT * FROM tasks ORDER BY created_at DESC")
    .all() as Task[];
}

export function createTask(data: {
  title: string;
  description?: string;
  status?: string;
  assignee?: string;
}): string {
  const id = randomUUID();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO tasks (id, title, description, status, assignee, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.title,
      data.description ?? null,
      data.status ?? "todo",
      data.assignee ?? "me",
      now,
      now
    );
  return id;
}

export function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    assignee?: string;
  }
): void {
  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push("status = ?");
    values.push(data.status);
  }
  if (data.assignee !== undefined) {
    fields.push("assignee = ?");
    values.push(data.assignee);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(now, id);

  getDb()
    .prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);
}

export function deleteTask(id: string): void {
  getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

