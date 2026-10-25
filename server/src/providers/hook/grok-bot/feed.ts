import {
  GROK_BOT_STATUSES,
  type GrokBotStatus,
  OFFICE_THEMES,
  type OfficeTheme,
} from './constants.js';
import { grokBotAgentIdFromSession } from './roster.js';

/** One agent's live status. This is the documented feed row. */
export interface GrokBotAgentStatus {
  agent_id: string;
  name?: string;
  role?: string;
  status: GrokBotStatus;
  last_action?: string;
  /** Optional scene hint (`office` | `garden`). Ignored per-row in v1; the
   *  snapshot-level `theme` / CLI `--theme` owns the scene. */
  theme?: OfficeTheme;
  room?: string;
}

/** File / POST body: a single row or a snapshot of many. */
export interface GrokBotFeedSnapshot {
  theme?: OfficeTheme;
  agents: GrokBotAgentStatus[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isStatus(value: unknown): value is GrokBotStatus {
  return typeof value === 'string' && (GROK_BOT_STATUSES as readonly string[]).includes(value);
}

function isTheme(value: unknown): value is OfficeTheme {
  return typeof value === 'string' && (OFFICE_THEMES as readonly string[]).includes(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** True when a POST body is a Grok Bot status row or snapshot (not a Claude hook). */
export function isGrokBotFeedPayload(raw: unknown): boolean {
  const rec = asRecord(raw);
  if (!rec) return false;
  if (Array.isArray(rec.agents)) return true;
  if (typeof rec.agent_id === 'string' && rec.agent_id.length > 0) return true;
  if (typeof rec.status === 'string' && isStatus(rec.status)) return true;
  return rec.hook_event_name === 'AgentStatus';
}

export function parseGrokBotAgentStatus(raw: unknown): GrokBotAgentStatus | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const agentId = optionalString(rec.agent_id) ?? optionalString(rec.session_id);
  if (!agentId) return null;
  if (!isStatus(rec.status)) return null;
  const theme = isTheme(rec.theme) ? rec.theme : undefined;
  const row: GrokBotAgentStatus = {
    agent_id: grokBotAgentIdFromSession(agentId),
    status: rec.status,
  };
  const name = optionalString(rec.name);
  const role = optionalString(rec.role);
  const lastAction = optionalString(rec.last_action) ?? optionalString(rec.lastAction);
  const room = optionalString(rec.room);
  if (name) row.name = name;
  if (role) row.role = role;
  if (lastAction) row.last_action = lastAction;
  if (theme) row.theme = theme;
  if (room) row.room = room;
  return row;
}

export function parseGrokBotFeed(raw: unknown): GrokBotFeedSnapshot | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  if (Array.isArray(rec.agents)) {
    const agents = rec.agents
      .map((row) => parseGrokBotAgentStatus(row))
      .filter((row): row is GrokBotAgentStatus => row !== null);
    if (agents.length === 0) return { theme: isTheme(rec.theme) ? rec.theme : undefined, agents };
    return { theme: isTheme(rec.theme) ? rec.theme : undefined, agents };
  }

  const single = parseGrokBotAgentStatus(rec);
  if (!single) return null;
  return { theme: single.theme ?? (isTheme(rec.theme) ? rec.theme : undefined), agents: [single] };
}

/** Shape the HTTP hook route and the file watcher both send into normalizeHookEvent. */
export function statusToHookPayload(status: GrokBotAgentStatus): Record<string, unknown> {
  return {
    hook_event_name: 'AgentStatus',
    session_id: status.agent_id,
    agent_id: status.agent_id,
    name: status.name,
    status: status.status,
    last_action: status.last_action,
  };
}
