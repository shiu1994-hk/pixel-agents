import { afterEach, describe, expect, it } from 'vitest';

import { AgentRuntime } from '../src/agentRuntime.js';
import { AgentStateStore } from '../src/agentStateStore.js';
import { GrokBotFeed } from '../src/providers/hook/grok-bot/feedRuntime.js';
import { grokBotProvider } from '../src/providers/hook/grok-bot/grokBot.js';
import {
  DEFAULT_GROK_BOT_ROSTER,
  grokBotSessionId,
} from '../src/providers/hook/grok-bot/roster.js';
import { claudeProvider } from '../src/providers/index.js';

describe('GrokBotFeed', () => {
  let feed: GrokBotFeed | undefined;

  afterEach(() => {
    feed?.dispose();
    feed = undefined;
  });

  it('seeds the default roster as hooks-only agents with names', () => {
    const store = new AgentStateStore();
    const runtime = new AgentRuntime(store, claudeProvider, {
      providers: [claudeProvider, grokBotProvider],
    });
    feed = new GrokBotFeed({ store, runtime, demo: false });
    feed.seedRoster();

    expect(store.size).toBe(DEFAULT_GROK_BOT_ROSTER.length);
    const bubu = [...store.values()].find((a) => a.agentName === 'AI BUBU');
    expect(bubu).toBeDefined();
    expect(bubu?.sessionId).toBe(grokBotSessionId('ai-bubu'));
    expect(bubu?.directoryName).toBe('Chief of Staff');
    expect(bubu?.hooksOnly).toBe(true);
    expect(bubu?.providerId).toBe('grok-bot');
    runtime.dispose();
  });

  it('applies a live status and broadcasts activity', () => {
    const store = new AgentStateStore();
    const runtime = new AgentRuntime(store, claudeProvider, {
      providers: [claudeProvider, grokBotProvider],
    });
    const broadcasts: Array<Record<string, unknown>> = [];
    store.on('broadcast', (msg) => broadcasts.push(msg));
    feed = new GrokBotFeed({ store, runtime, demo: false });
    feed.handleIncoming({
      agent_id: 'stock-trader',
      name: 'Stock Trader',
      role: 'Markets',
      status: 'reading',
      last_action: 'Scanning the tape',
    });

    const trader = [...store.values()].find((a) => a.agentName === 'Stock Trader');
    expect(trader).toBeDefined();
    expect(
      broadcasts.some((m) => m.type === 'agentToolStart' && m.status === 'Scanning the tape'),
    ).toBe(true);
    runtime.dispose();
  });
});
