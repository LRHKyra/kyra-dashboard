import path from "path";

const home = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "", ".openclaw");
const workspace = process.env.CLAWD_WORKSPACE || path.join(process.env.HOME || "", "clawd");

export const PATHS = {
  // OpenClaw home
  home,
  sessionsDir: path.join(home, "agents/main/sessions"),
  sessionsIndex: path.join(home, "agents/main/sessions/sessions.json"),
  memoryDb: path.join(home, "memory/main.sqlite"),
  config: path.join(home, "openclaw.json"),
  cronJobs: path.join(home, "cron/jobs.json"),
  subagentRuns: path.join(home, "subagents/runs.json"),
  execApprovals: path.join(home, "exec-approvals.json"),
  gatewayLog: path.join(home, "logs/gateway.log"),
  gatewayErrLog: path.join(home, "logs/gateway.err.log"),
  // Workspace
  workspace,
  agentsDir: path.join(workspace, "agents"),
  pipelineMd: path.join(workspace, "agents/PIPELINE.md"),
  sharedContext: path.join(workspace, "agents/shared/kyra-context.md"),
  soulMd: path.join(workspace, "SOUL.md"),
  agentsMd: path.join(workspace, "AGENTS.md"),
  memoryMd: path.join(workspace, "MEMORY.md"),
  memoryDir: path.join(workspace, "memory"),
  // AI Playbook
  playbookRoot: path.join(workspace, "ai-playbook"),
  playbookCore: path.join(workspace, "ai-playbook/core/CORE_PLAYBOOK.md"),
  playbookCandidatesQueue: path.join(workspace, "ai-playbook/candidates/queue"),
  playbookCandidatesApproved: path.join(workspace, "ai-playbook/candidates/approved"),
  playbookCandidatesRejected: path.join(workspace, "ai-playbook/candidates/rejected"),
  playbookDigestsNightly: path.join(workspace, "ai-playbook/digests/nightly"),
  playbookDigestsWeekly: path.join(workspace, "ai-playbook/digests/weekly"),
  playbookSourceLog: path.join(workspace, "ai-playbook/logs/SOURCE_LOG.jsonl"),
  playbookRunLog: path.join(workspace, "ai-playbook/logs/RUN_LOG.jsonl"),
  playbookPromotionLog: path.join(workspace, "ai-playbook/logs/PROMOTION_LOG.jsonl"),
  playbookSources: path.join(workspace, "ai-playbook/config/SOURCES.yaml"),
  // Runtime (on the remote Mac Mini)
  runtimeLogDir: "/tmp/openclaw",
};
