import { describe, expect, it } from 'vitest';

import { parseGrokBotFeed } from '../src/providers/hook/grok-bot/feed.js';
import { grokBotProvider, normalizeHookEvent } from '../src/providers/hook/grok-bot/grokBot.js';
import {
  DEFAULT_GROK_BOT_ROSTER,
  grokBotSessionId,
} from '../src/providers/hook/grok-bot/roster.js';

describe('grokBotProvider', () => {
  it('has kind hook and a stable id', () => {
    expect(grokBotProvider.kind).toBe('hook');
    expect(grokBotProvider.id).toBe('grok-bot');
    expect(grokBotProvider.protocolVersion).toBe(1);
    expect(grokBotProvider.readingTools.has('Read')).toBe(true);
  });

  it('reports hooks already installed so the Intro never asks', async () => {
    await expect(grokBotProvider.areHooksInstalled()).resolves.toBe(true);
  });

  it("seeds Tong's named roster", () => {
    const names = DEFAULT_GROK_BOT_ROSTER.map((b) => b.name);
    expect(names).toEqual([
      'AI BUBU',
      'Stock Trader',
      'Database Master',
      'Web Tools Builder',
      'Designer',
      'Personal Helper',
      'Learning Machine',
    ]);
  });
});

describe('normalizeHookEvent', () => {
  it('returns null without an agent id', () => {
    expect(normalizeHookEvent({ status: 'working' })).toBeNull();
  });

  it('maps working / reading / waiting / idle / error', () => {
    const working = normalizeHookEvent({
      agent_id: 'ai-bubu',
      status: 'working',
      last_action: 'Briefing Tong',
    });
    expect(working?.sessionId).toBe(grokBotSessionId('ai-bubu'));
    expect(working?.event.kind).toBe('toolStart');
    if (working?.event.kind === 'toolStart') {
      expect(working.event.toolName).toBe('Work');
    }

    const reading = normalizeHookEvent({ agent_id: 'stock-trader', status: 'reading' });
    expect(reading?.event.kind).toBe('toolStart');
    if (reading?.event.kind === 'toolStart') {
      expect(reading.event.toolName).toBe('Read');
    }

    expect(normalizeHookEvent({ agent_id: 'x', status: 'waiting' })?.event).toEqual({
      kind: 'turnEnd',
      awaitingInput: true,
    });
    expect(normalizeHookEvent({ agent_id: 'x', status: 'idle' })?.event).toEqual({
      kind: 'turnEnd',
    });
    expect(normalizeHookEvent({ agent_id: 'x', status: 'error' })?.event.kind).toBe(
      'permissionRequest',
    );
  });

  it('formats last_action as the activity label', () => {
    expect(grokBotProvider.formatToolStatus('Work', { last_action: 'Scanning the tape' })).toBe(
      'Scanning the tape',
    );
    expect(grokBotProvider.formatToolStatus('Read', {})).toBe('Reading');
  });
});

describe('parseGrokBotFeed', () => {
  it('accepts a single row or an agents snapshot', () => {
    expect(parseGrokBotFeed({ agent_id: 'ai-bubu', status: 'idle', name: 'AI BUBU' })).toEqual({
      theme: undefined,
      agents: [{ agent_id: 'ai-bubu', name: 'AI BUBU', status: 'idle' }],
    });

    const snap = parseGrokBotFeed({
      theme: 'garden',
      agents: [
        { agent_id: 'designer', status: 'working', last_action: 'Pushing pixels' },
        { agent_id: 'nope', status: 'flying' },
      ],
    });
    expect(snap?.theme).toBe('garden');
    expect(snap?.agents).toEqual([
      { agent_id: 'designer', status: 'working', last_action: 'Pushing pixels' },
    ]);
  });

  it('returns null for unrelated JSON', () => {
    expect(parseGrokBotFeed({ hook_event_name: 'Stop', session_id: 'x' })).toBeNull();
    expect(parseGrokBotFeed('nope')).toBeNull();
  });
});
