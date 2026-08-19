export type JarvisState =
  | "idle"
  | "ready"
  | "waiting"
  | "listening"
  | "speaking"
  | "thinking"
  | "agent"
  | "ask"
  | "done"
  | "error"
  | string;

export type AgentJob = {
  id: string;
  kind?: string;
  task?: string;
  status?: string;
  started_at?: number;
  log_dir?: string | null;
  updated_at?: number;
};

export type StatusPayload = {
  ok: true;
  state: JarvisState;
  detail: string;
  task: string | null;
  updated_at: number;
  stt_active: boolean;
  logs: string[];
  agents: AgentJob[];
  last_spoken: string | null;
  queued: boolean;
  screen_at: number | null;
  screen_width: number | null;
  screen_height: number | null;
  photo_at: number | null;
  photo_width: number | null;
  photo_height: number | null;
  photo_pending: boolean;
};

function parseOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type HealthPayload = {
  ok: true;
  service: string;
  auth: boolean;
};

export type ErrorPayload = {
  ok: false;
  error: string;
};

export type CommandResponse = {
  ok: true;
  queued: boolean;
  text: string;
};

export type AudioResponse = {
  ok: true;
  queued: boolean;
  text: string;
  source: string;
};

export type PhotoResponse = {
  ok: true;
  queued: boolean;
  text: string;
  source: string;
  caption_source?: string;
  width: number | null;
  height: number | null;
};

export type ControlAction = "send" | "mark_done" | "done" | "quit";

export type ControlResponse = {
  ok: true;
  action: string;
};

export function isErrorPayload(value: unknown): value is ErrorPayload {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return o.ok === false && typeof o.error === "string";
}

export function parseAgentJob(value: unknown): AgentJob | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return null;
  return {
    id: o.id,
    kind: typeof o.kind === "string" ? o.kind : undefined,
    task: typeof o.task === "string" ? o.task : undefined,
    status: typeof o.status === "string" ? o.status : undefined,
    started_at: typeof o.started_at === "number" ? o.started_at : undefined,
    log_dir: typeof o.log_dir === "string" || o.log_dir === null ? o.log_dir : undefined,
    updated_at: typeof o.updated_at === "number" ? o.updated_at : undefined,
  };
}

export function parseStatusPayload(value: unknown): StatusPayload {
  if (typeof value !== "object" || value === null) {
    throw new Error("invalid status");
  }
  const o = value as Record<string, unknown>;
  if (o.ok !== true) {
    const err = isErrorPayload(value) ? value.error : "invalid status";
    throw new Error(err);
  }
  const agents = Array.isArray(o.agents)
    ? o.agents.map(parseAgentJob).filter((a): a is AgentJob => a !== null)
    : [];
  const logs = Array.isArray(o.logs)
    ? o.logs.filter((line): line is string => typeof line === "string")
    : [];
  return {
    ok: true,
    state: typeof o.state === "string" ? o.state : "idle",
    detail: typeof o.detail === "string" ? o.detail : "",
    task: typeof o.task === "string" ? o.task : null,
    updated_at: typeof o.updated_at === "number" ? o.updated_at : 0,
    stt_active: Boolean(o.stt_active),
    logs,
    agents,
    last_spoken: typeof o.last_spoken === "string" ? o.last_spoken : null,
    queued: Boolean(o.queued),
    screen_at: parseOptionalNumber(o.screen_at),
    screen_width: parseOptionalNumber(o.screen_width),
    screen_height: parseOptionalNumber(o.screen_height),
    photo_at: parseOptionalNumber(o.photo_at),
    photo_width: parseOptionalNumber(o.photo_width),
    photo_height: parseOptionalNumber(o.photo_height),
    photo_pending: Boolean(o.photo_pending),
  };
}

export function parseHealthPayload(value: unknown): HealthPayload {
  if (typeof value !== "object" || value === null) {
    throw new Error("invalid health");
  }
  const o = value as Record<string, unknown>;
  if (o.ok !== true) {
    throw new Error(isErrorPayload(value) ? value.error : "health check failed");
  }
  return {
    ok: true,
    service: typeof o.service === "string" ? o.service : "unknown",
    auth: Boolean(o.auth),
  };
}
