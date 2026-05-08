import * as rfs from "./remote-fs";
import { PATHS } from "./paths";

export const TASKS_DB_ID = "788cf093-2dba-4fcc-baa9-5ac0ecbcd4f5";
const NOTION_VERSION = "2022-06-28";

// ── API key cache ──────────────────────────────────────────────────────────

let cachedApiKey: string | null = null;
let keyFetchedAt = 0;
const KEY_TTL = 5 * 60_000;

async function getApiKey(): Promise<string> {
  const now = Date.now();
  if (cachedApiKey && now - keyFetchedAt < KEY_TTL) return cachedApiKey;

  const config = await rfs.readJSON<{
    skills?: { entries?: { notion?: { apiKey?: string } } };
  }>(PATHS.config);
  const key = config?.skills?.entries?.notion?.apiKey;
  if (!key) throw new Error("Notion API key not found in OpenClaw config");

  cachedApiKey = key;
  keyFetchedAt = now;
  return key;
}

// ── Low-level fetch ────────────────────────────────────────────────────────

async function notionFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const key = await getApiKey();
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ── Property helpers ───────────────────────────────────────────────────────

function richText(props: Record<string, unknown>, key: string): string | null {
  const p = props[key] as { rich_text?: Array<{ plain_text: string }> } | undefined;
  return p?.rich_text?.map((r) => r.plain_text).join("") || null;
}

function selectVal(props: Record<string, unknown>, key: string): string | null {
  const p = props[key] as { select?: { name: string } | null } | undefined;
  return p?.select?.name ?? null;
}

function dateVal(props: Record<string, unknown>, key: string): string | null {
  const p = props[key] as { date?: { start: string } | null } | undefined;
  return p?.date?.start ?? null;
}

function titleVal(props: Record<string, unknown>): string {
  const p = props["Name"] as { title?: Array<{ plain_text: string }> } | undefined;
  return p?.title?.map((r) => r.plain_text).join("") || "(Untitled)";
}

// ── Task type ──────────────────────────────────────────────────────────────

export type TaskStatus = "Backlog" | "Todo" | "In Progress" | "Blocked" | "Done" | "Cancelled";
export type TaskPriority = "P0" | "P1" | "P2" | "P3";
export type TaskCategory = "Product" | "GTM" | "Fundraising" | "Ops" | "Legal" | "People" | "Personal";

export interface NotionTask {
  id: string;
  title: string;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  category: TaskCategory | null;
  nextAction: string | null;
  blockingReason: string | null;
  due: string | null;
  url: string;
  createdTime: string;
  lastEditedTime: string;
}

function parsePage(page: Record<string, unknown>): NotionTask {
  const props = page.properties as Record<string, unknown>;
  return {
    id: page.id as string,
    title: titleVal(props),
    status: selectVal(props, "Status") as TaskStatus | null,
    priority: selectVal(props, "Priority") as TaskPriority | null,
    category: selectVal(props, "Category") as TaskCategory | null,
    nextAction: richText(props, "Next Action"),
    blockingReason: richText(props, "Blocking Reason"),
    due: dateVal(props, "Due"),
    url: page.url as string,
    createdTime: page.created_time as string,
    lastEditedTime: page.last_edited_time as string,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

interface QueryResponse {
  results: Record<string, unknown>[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function listTasks(filter?: {
  status?: TaskStatus[];
  excludeCancelled?: boolean;
}): Promise<NotionTask[]> {
  const allTasks: NotionTask[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const data = await notionFetch<QueryResponse>(
      `/databases/${TASKS_DB_ID}/query`,
      { method: "POST", body: JSON.stringify(body) }
    );

    for (const page of data.results) {
      allTasks.push(parsePage(page));
    }

    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  let tasks = allTasks;
  if (filter?.excludeCancelled) {
    tasks = tasks.filter((t) => t.status !== "Cancelled");
  }
  if (filter?.status) {
    tasks = tasks.filter((t) => t.status && filter.status!.includes(t.status));
  }
  return tasks;
}

export async function createTask(data: {
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  nextAction?: string;
  due?: string;
}): Promise<NotionTask> {
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: data.title } }] },
    Status: { select: { name: data.status ?? "Todo" } },
  };
  if (data.priority) properties.Priority = { select: { name: data.priority } };
  if (data.category) properties.Category = { select: { name: data.category } };
  if (data.nextAction) properties["Next Action"] = { rich_text: [{ text: { content: data.nextAction } }] };
  if (data.due) properties.Due = { date: { start: data.due } };

  const page = await notionFetch<Record<string, unknown>>("/pages", {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: TASKS_DB_ID }, properties }),
  });
  return parsePage(page);
}

export async function updateTask(
  pageId: string,
  data: {
    title?: string;
    status?: TaskStatus;
    priority?: TaskPriority | null;
    category?: TaskCategory | null;
    nextAction?: string | null;
    blockingReason?: string | null;
    due?: string | null;
  }
): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (data.title !== undefined) {
    properties.Name = { title: [{ text: { content: data.title } }] };
  }
  if (data.status !== undefined) {
    properties.Status = { select: { name: data.status } };
  }
  if (data.priority !== undefined) {
    properties.Priority = data.priority ? { select: { name: data.priority } } : { select: null };
  }
  if (data.category !== undefined) {
    properties.Category = data.category ? { select: { name: data.category } } : { select: null };
  }
  if (data.nextAction !== undefined) {
    properties["Next Action"] = data.nextAction
      ? { rich_text: [{ text: { content: data.nextAction } }] }
      : { rich_text: [] };
  }
  if (data.blockingReason !== undefined) {
    properties["Blocking Reason"] = data.blockingReason
      ? { rich_text: [{ text: { content: data.blockingReason } }] }
      : { rich_text: [] };
  }
  if (data.due !== undefined) {
    properties.Due = data.due ? { date: { start: data.due } } : { date: null };
  }

  await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

export async function archiveTask(pageId: string): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: true }),
  });
}
