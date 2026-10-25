import * as fs from 'fs';
import * as path from 'path';

import type { AgentRuntime } from '../../../agentRuntime.js';
import { createAgentState } from '../../../agentState.js';
import type { AgentStateStore } from '../../../agentStateStore.js';
import { assignPaletteIfNeeded } from '../../../paletteAssigner.js';
import {
  GROK_BOT_DEMO_TICK_MS,
  GROK_BOT_FEED_POLL_MS,
  GROK_BOT_PROVIDER_ID,
  type GrokBotStatus,
} from './constants.js';
import type { GrokBotAgentStatus, GrokBotFeedSnapshot } from './feed.js';
import { parseGrokBotFeed, statusToHookPayload } from './feed.js';
import { DEFAULT_GROK_BOT_ROSTER, type GrokBotRosterEntry, grokBotSessionId } from './roster.js';

export interface GrokBotFeedOptions {
  store: AgentStateStore;
  runtime: AgentRuntime;
  /** Seed Tong's roster so the office is populated. */
  demo: boolean;
  /** Optional JSON file to poll. Live rows mute the demo ticker for that bot. */
  feedPath?: string;
}

/**
 * Owns Grok Bot characters: seeds the roster, applies a local JSON / HTTP
 * feed, and (in demo mode) walks each bot through role-flavoured activity
 * until a live update arrives for that agent.
 */
export class GrokBotFeed {
  private readonly store: AgentStateStore;
  private readonly runtime: AgentRuntime;
  private readonly liveAgentIds = new Set<string>();
  private readonly lastStatus = new Map<string, GrokBotStatus>();
  private demoTimer: ReturnType<typeof setInterval> | null = null;
  private feedTimer: ReturnType<typeof setInterval> | null = null;
  private lastFeedMtime = 0;
  private lastFeedJson = '';
  private demoTick = 0;

  constructor(private readonly options: GrokBotFeedOptions) {
    this.store = options.store;
    this.runtime = options.runtime;
  }

  start(): void {
    if (this.options.demo) {
      const adapter = this.store.getAdapter();
      if (adapter && !adapter.getSetting('pixel-agents.alwaysShowLabels', false)) {
        adapter.setSetting('pixel-agents.alwaysShowLabels', true);
      }
      this.seedRoster(DEFAULT_GROK_BOT_ROSTER);
      this.startDemo();
      console.log(
        `[Pixel Agents] Grok Bot demo roster: ${DEFAULT_GROK_BOT_ROSTER.length} teammates (AI BUBU and company)`,
      );
    }
    if (this.options.feedPath) {
      this.startFileWatch(this.options.feedPath);
      console.log(`[Pixel Agents] Grok Bot feed: watching ${this.options.feedPath}`);
    }
  }

  /** HTTP / hook-route ingress. Accepts a row, a snapshot, or a hook event. */
  handleIncoming(raw: Record<string, unknown>): void {
    const snapshot = parseGrokBotFeed(raw);
    if (snapshot) {
      this.applySnapshot(snapshot, { live: true });
      return;
    }
    this.runtime.handleHookEvent(GROK_BOT_PROVIDER_ID, raw);
  }

  applySnapshot(snapshot: GrokBotFeedSnapshot, opts?: { live?: boolean }): void {
    for (const row of snapshot.agents) {
      this.applyStatus(row, opts);
    }
  }

  applyStatus(row: GrokBotAgentStatus, opts?: { live?: boolean }): void {
    const sessionId = grokBotSessionId(row.agent_id);
    if (opts?.live) this.liveAgentIds.add(row.agent_id);
    this.ensureAgent(row);
    this.dispatchStatus(sessionId, row.status, row.last_action);
  }

  seedRoster(roster: readonly GrokBotRosterEntry[] = DEFAULT_GROK_BOT_ROSTER): void {
    for (const bot of roster) {
      this.ensureAgent({
        agent_id: bot.id,
        name: bot.name,
        role: bot.role,
        status: 'idle',
      });
    }
    this.store.persist();
  }

  dispose(): void {
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
    if (this.feedTimer) {
      clearInterval(this.feedTimer);
      this.feedTimer = null;
    }
  }

  private ensureAgent(row: GrokBotAgentStatus): void {
    const sessionId = grokBotSessionId(row.agent_id);
    for (const agent of this.store.values()) {
      if (agent.sessionId === sessionId) {
        if (row.name && !agent.agentName) agent.agentName = row.name;
        if (row.role && !agent.directoryName) agent.directoryName = row.role;
        this.runtime.registerAgent(sessionId, agent.id);
        return;
      }
    }

    const roster = DEFAULT_GROK_BOT_ROSTER.find((b) => b.id === row.agent_id);
    const id = this.store.nextAgentId.current++;
    const agent = createAgentState({
      id,
      sessionId,
      isExternal: true,
      projectDir: 'grok-bot',
      jsonlFile: '',
      hooksOnly: true,
      hookDelivered: true,
      providerId: GROK_BOT_PROVIDER_ID,
      agentName: row.name ?? roster?.name ?? row.agent_id,
      directoryName: row.role ?? roster?.role,
      palette: roster?.palette,
      hueShift: roster?.hueShift,
      lastDataAt: Date.now(),
    });
    assignPaletteIfNeeded(agent, this.store);
    this.store.set(id, agent);
    this.runtime.registerAgent(sessionId, id);
    this.store.persist();
    console.log(`[Pixel Agents] Grok Bot: ${agent.agentName ?? sessionId} sat down (Agent ${id})`);
  }

  private dispatchStatus(sessionId: string, status: GrokBotStatus, lastAction?: string): void {
    const previous = this.lastStatus.get(sessionId);
    if (previous === 'working' || previous === 'reading') {
      this.runtime.handleHookEvent(GROK_BOT_PROVIDER_ID, {
        hook_event_name: 'PostToolUse',
        session_id: sessionId,
      });
    }
    this.runtime.handleHookEvent(
      GROK_BOT_PROVIDER_ID,
      statusToHookPayload({ agent_id: sessionId, status, last_action: lastAction }),
    );
    this.lastStatus.set(sessionId, status);
  }

  private startDemo(): void {
    if (this.demoTimer) return;
    this.tickDemo();
    this.demoTimer = setInterval(() => this.tickDemo(), GROK_BOT_DEMO_TICK_MS);
  }

  private tickDemo(): void {
    const roster = DEFAULT_GROK_BOT_ROSTER;
    if (roster.length === 0) return;
    const bot = roster[this.demoTick % roster.length];
    this.demoTick += 1;
    if (!bot || this.liveAgentIds.has(bot.id)) return;

    const status = pickDemoStatus(this.demoTick);
    const lines = bot.demoActions[status];
    const lastAction = lines[this.demoTick % lines.length];
    this.applyStatus({
      agent_id: bot.id,
      name: bot.name,
      role: bot.role,
      status,
      last_action: lastAction,
    });
  }

  private startFileWatch(feedPath: string): void {
    const resolved = path.resolve(feedPath);
    this.readFeedFile(resolved);
    this.feedTimer = setInterval(() => this.readFeedFile(resolved), GROK_BOT_FEED_POLL_MS);
  }

  private readFeedFile(feedPath: string): void {
    try {
      if (!fs.existsSync(feedPath)) return;
      const stat = fs.statSync(feedPath);
      if (stat.mtimeMs <= this.lastFeedMtime) return;
      const raw = fs.readFileSync(feedPath, 'utf-8');
      if (raw === this.lastFeedJson) {
        this.lastFeedMtime = stat.mtimeMs;
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      const snapshot = parseGrokBotFeed(parsed);
      if (!snapshot) {
        console.warn(`[Pixel Agents] Grok Bot feed ignored (unrecognized JSON): ${feedPath}`);
        return;
      }
      this.lastFeedMtime = stat.mtimeMs;
      this.lastFeedJson = raw;
      this.applySnapshot(snapshot, { live: true });
    } catch (err) {
      console.warn(
        `[Pixel Agents] Grok Bot feed read failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function pickDemoStatus(tick: number): GrokBotStatus {
  const cycle: GrokBotStatus[] = ['reading', 'working', 'idle', 'waiting', 'working', 'error'];
  return cycle[tick % cycle.length] ?? 'idle';
}
