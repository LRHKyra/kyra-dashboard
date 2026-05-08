/**
 * Chief of Staff library — calls the CoS CLI on the mac-mini via SSH.
 * All functions exec a CLI command and parse the JSON stdout.
 */

import { exec } from "./ssh-client";

const COS_CLI = "/Users/lucas/code/openclaw-chief-of-staff/dist/cli.js";
const COS_ENV = "COS_CONFIG_PATH=/Users/lucas/.openclaw/cos-config.yaml";
const NODE = "/opt/homebrew/bin/node";

function cosCmd(args: string): string {
  return `export PATH="/opt/homebrew/bin:$PATH" && ${COS_ENV} ${NODE} ${COS_CLI} ${args}`;
}

// --- Types ---

export interface ReviewQueueItem {
  assignment: CosAssignment;
  bucket: "decision" | "review" | "approval";
  pending_approvals: CosApproval[];
  artifacts: CosArtifact[];
}

export interface ReviewQueue {
  decisions: ReviewQueueItem[];
  reviews: ReviewQueueItem[];
  approvals: ReviewQueueItem[];
}

export interface CosAssignment {
  id: string;
  project_id: string;
  slack_channel_id: string | null;
  slack_thread_ts: string | null;
  source_message_link: string | null;
  raw_request: string;
  normalized_outcome: string | null;
  work_type: string | null;
  artifact_type: string | null;
  urgency: string;
  risk_class: string;
  route_lane: string | null;
  current_state: string;
  waiting_on: string | null;
  next_action: string | null;
  assigned_worker: string | null;
  due_date: string | null;
  latest_summary: string | null;
  normalized_payload: string | null;
  router_output: string | null;
  created_at: string;
  updated_at: string;
}

export interface CosApproval {
  id: string;
  assignment_id: string;
  approval_type: string;
  requested_action: string;
  risk_note: string | null;
  status: string;
  requested_at: string;
  resolved_at: string | null;
}

export interface CosArtifact {
  id: string;
  assignment_id: string;
  kind: string;
  location: string;
  version: number;
  review_status: string;
  change_summary: string | null;
  metadata: string;
  created_at: string;
}

export interface CosEvent {
  id: string;
  assignment_id: string;
  event_type: string;
  event_payload: string;
  created_at: string;
}

export interface AssignmentDetail {
  assignment: CosAssignment;
  events: CosEvent[];
}

export interface IntakeResult {
  kind: string;
  assignment_id?: string;
  project_id?: string;
  work_type?: string;
  route_lane?: string;
  flow_template?: string;
  next_state?: string;
  shadow_mode?: boolean;
  review_required?: boolean;
  reasoning?: string;
  reason?: string;
  errors?: string[];
}

export interface PendingAsk {
  ask_batch_id: string;
  assignment_id: string;
  recipient: string;
  ask_type: string;
  questions: string[];
  due_at: string | null;
}

// --- Functions ---

export async function cosReviewQueue(): Promise<ReviewQueue> {
  const stdout = await exec(cosCmd("review-queue"));
  return JSON.parse(stdout);
}

export async function cosInspect(id: string): Promise<AssignmentDetail> {
  const stdout = await exec(cosCmd(`inspect ${id}`));
  return JSON.parse(stdout);
}

export async function cosIntake(text: string): Promise<IntakeResult> {
  const escaped = text.replace(/'/g, "'\\''");
  const stdout = await exec(
    cosCmd(`intake --text '${escaped}' --channel web --user web --message-ts ${Date.now() / 1000}`),
  );
  return JSON.parse(stdout);
}

export async function cosPendingAsks(assignmentId?: string): Promise<PendingAsk[]> {
  const arg = assignmentId ?? "";
  const stdout = await exec(cosCmd(`pending-asks ${arg}`));
  return JSON.parse(stdout);
}

export async function cosAnswerClarification(
  assignmentId: string,
  response: string,
): Promise<unknown> {
  const escaped = response.replace(/'/g, "'\\''");
  const stdout = await exec(
    cosCmd(`answer-clarification --assignment ${assignmentId} --response '${escaped}'`),
  );
  return JSON.parse(stdout);
}

export async function cosResume(assignmentId: string): Promise<unknown> {
  const stdout = await exec(cosCmd(`resume ${assignmentId}`));
  return JSON.parse(stdout);
}

export async function cosMarkSent(askBatchId: string): Promise<unknown> {
  const stdout = await exec(cosCmd(`mark-sent ${askBatchId}`));
  return JSON.parse(stdout);
}

export async function cosMarkAnswered(askBatchId: string): Promise<unknown> {
  const stdout = await exec(cosCmd(`mark-answered ${askBatchId}`));
  return JSON.parse(stdout);
}

export async function cosWeeklyDigest(days: number = 7): Promise<string> {
  return exec(cosCmd(`weekly-digest --days ${days}`));
}

export async function cosListAssignments(): Promise<CosAssignment[]> {
  // Quick helper: query all assignments via SSH + sqlite3
  const stdout = await exec(
    `export PATH="/opt/homebrew/bin:$PATH" && sqlite3 -json /Users/lucas/.openclaw/cos-tracker.sqlite "select * from cos_assignments order by created_at desc limit 50;"`,
  );
  return JSON.parse(stdout || "[]");
}
