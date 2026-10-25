import type { AgentEvent, HookProvider } from '../../../../../core/src/provider.js';
import { CONSENT_DISCLOSURE, CONSENT_INSTALL_HEADLINE } from './consentCopy.js';
import {
  GROK_BOT_DISPLAY_NAME,
  GROK_BOT_PROVIDER_ID,
  GROK_BOT_STATUSES,
  type GrokBotStatus,
} from './constants.js';
import { grokBotSessionId } from './roster.js';

const READING_TOOLS = new Set(['Read']);
const WORK_TOOLS = new Set(['Work', 'Write', 'Edit']);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sessionIdFrom(raw: Record<string, unknown>): string | null {
  if (typeof raw.session_id === 'string' && raw.session_id.length > 0) {
    return grokBotSessionId(raw.session_id);
  }
  if (typeof raw.agent_id === 'string' && raw.agent_id.length > 0) {
    return grokBotSessionId(raw.agent_id);
  }
  return null;
}

function isStatus(value: unknown): value is GrokBotStatus {
  return typeof value === 'string' && (GROK_BOT_STATUSES as readonly string[]).includes(value);
}

function lastActionOf(raw: Record<string, unknown>): string | undefined {
  const value = raw.last_action ?? raw.lastAction;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Map one Grok Bot status row (or a Claude-shaped hook event) onto AgentEvent.
 * Status rows are the v1 feed; hook_event_name is accepted so the same HTTP
 * route can also carry already-normalized lifecycle events.
 */
export function normalizeHookEvent(
  raw: Record<string, unknown>,
): { sessionId: string; event: AgentEvent } | null {
  const sessionId = sessionIdFrom(raw);
  if (!sessionId) return null;

  const eventName = raw.hook_event_name;
  if (eventName === 'PostToolUse' || eventName === 'PostToolUseFailure') {
    return { sessionId, event: { kind: 'toolEnd', toolId: 'current' } };
  }
  if (eventName === 'Stop') {
    return { sessionId, event: { kind: 'turnEnd' } };
  }
  if (eventName === 'Notification' && raw.notification_type === 'idle_prompt') {
    return { sessionId, event: { kind: 'turnEnd', awaitingInput: true } };
  }
  if (eventName === 'PermissionRequest') {
    return { sessionId, event: { kind: 'permissionRequest' } };
  }
  if (eventName === 'SessionStart') {
    return {
      sessionId,
      event: {
        kind: 'sessionStart',
        source: typeof raw.source === 'string' ? raw.source : 'grok-bot',
        cwd: typeof raw.cwd === 'string' ? raw.cwd : 'grok-bot',
      },
    };
  }
  if (eventName === 'SessionEnd') {
    return {
      sessionId,
      event: {
        kind: 'sessionEnd',
        reason: typeof raw.reason === 'string' ? raw.reason : undefined,
      },
    };
  }

  if (!isStatus(raw.status) && eventName !== 'AgentStatus' && eventName !== 'PreToolUse') {
    return null;
  }

  if (eventName === 'PreToolUse') {
    const toolName = typeof raw.tool_name === 'string' ? raw.tool_name : 'Work';
    const toolInput = asRecord(raw.tool_input) ?? {};
    return {
      sessionId,
      event: {
        kind: 'toolStart',
        toolId: `grok-${sessionId}`,
        toolName,
        input: toolInput,
      },
    };
  }

  const status: GrokBotStatus = isStatus(raw.status) ? raw.status : 'working';
  const lastAction = lastActionOf(raw);
  switch (status) {
    case 'working':
      return {
        sessionId,
        event: {
          kind: 'toolStart',
          toolId: `grok-${sessionId}`,
          toolName: 'Work',
          input: lastAction ? { last_action: lastAction } : {},
        },
      };
    case 'reading':
      return {
        sessionId,
        event: {
          kind: 'toolStart',
          toolId: `grok-${sessionId}`,
          toolName: 'Read',
          input: lastAction ? { last_action: lastAction, file_path: lastAction } : {},
        },
      };
    case 'waiting':
      return { sessionId, event: { kind: 'turnEnd', awaitingInput: true } };
    case 'idle':
      return { sessionId, event: { kind: 'turnEnd' } };
    case 'error':
      return { sessionId, event: { kind: 'permissionRequest' } };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatToolStatus(toolName: string, input?: unknown): string {
  const rec = asRecord(input);
  const lastAction =
    rec && typeof rec.last_action === 'string' && rec.last_action.trim().length > 0
      ? rec.last_action.trim()
      : undefined;
  if (lastAction) return lastAction;
  if (READING_TOOLS.has(toolName)) return 'Reading';
  if (WORK_TOOLS.has(toolName)) return 'Working';
  if (toolName === 'Error') return 'Something went wrong';
  return toolName ? `Using ${toolName}` : 'Working';
}

async function installHooks(_serverUrl: string, _authToken: string): Promise<void> {
  // No third-party settings file to write. The HTTP + file feed is always on.
}

async function uninstallHooks(): Promise<void> {
  // Nothing on disk to remove.
}

function areHooksInstalled(): Promise<boolean> {
  // Always "installed" so the Intro never asks about a file we do not touch.
  return Promise.resolve(true);
}

function consentDisclosure(): { headline: string; disclosure: string } {
  return { headline: CONSENT_INSTALL_HEADLINE, disclosure: CONSENT_DISCLOSURE };
}

export const grokBotProvider: HookProvider = {
  kind: 'hook',
  id: GROK_BOT_PROVIDER_ID,
  displayName: GROK_BOT_DISPLAY_NAME,
  protocolVersion: 1,

  normalizeHookEvent,
  installHooks,
  uninstallHooks,
  areHooksInstalled,
  consentDisclosure,

  formatToolStatus,
  permissionExemptTools: new Set(['Work', 'Read']),
  subagentToolNames: new Set(),
  readingTools: READING_TOOLS,
};
