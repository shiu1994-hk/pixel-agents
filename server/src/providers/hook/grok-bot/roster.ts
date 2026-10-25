import { GROK_BOT_SESSION_PREFIX } from './constants.js';

/** One named Grok Bot that can sit in the office. */
export interface GrokBotRosterEntry {
  /** Stable id used as the session key (`grok-bot:<id>`). */
  id: string;
  name: string;
  role: string;
  /** Preferred palette 0-5 so the demo roster looks diverse. */
  palette: number;
  /** Extra hue rotation when two bots share a palette. */
  hueShift?: number;
  /** Role-flavoured demo lines shown as the activity label. */
  demoActions: {
    working: readonly string[];
    reading: readonly string[];
    waiting: readonly string[];
    idle: readonly string[];
    error: readonly string[];
  };
}

export function grokBotSessionId(agentId: string): string {
  return agentId.startsWith(GROK_BOT_SESSION_PREFIX)
    ? agentId
    : `${GROK_BOT_SESSION_PREFIX}${agentId}`;
}

export function grokBotAgentIdFromSession(sessionId: string): string {
  return sessionId.startsWith(GROK_BOT_SESSION_PREFIX)
    ? sessionId.slice(GROK_BOT_SESSION_PREFIX.length)
    : sessionId;
}

/** Tong's main Grok Bot teammates. Palettes stay unique across the first six. */
export const DEFAULT_GROK_BOT_ROSTER: readonly GrokBotRosterEntry[] = [
  {
    id: 'ai-bubu',
    name: 'AI BUBU',
    role: 'Chief of Staff',
    palette: 0,
    demoActions: {
      working: ['Briefing Tong', 'Routing a teammate', 'Writing the daily plan'],
      reading: ['Reviewing the inbox', "Skimming last night's notes"],
      waiting: ['Waiting on Tong', 'Holding a decision'],
      idle: ['Desk tidy', 'Watching the floor'],
      error: ['Calendar collision', 'Missing a brief'],
    },
  },
  {
    id: 'stock-trader',
    name: 'Stock Trader',
    role: 'Markets',
    palette: 1,
    demoActions: {
      working: ['Rebalancing the book', 'Placing a paper trade'],
      reading: ['Scanning the tape', 'Reading a 10-Q'],
      waiting: ['Waiting on the open', 'Watching a halt'],
      idle: ['Markets closed', 'Sipping coffee'],
      error: ['Feed dropped', 'Symbol not found'],
    },
  },
  {
    id: 'database-master',
    name: 'Database Master',
    role: 'Data',
    palette: 2,
    demoActions: {
      working: ['Writing a query', 'Migrating a table'],
      reading: ['Explaining an index', 'Checking EXPLAIN'],
      waiting: ['Waiting on a lock', 'Vacuum in progress'],
      idle: ['Indexes warm', 'Watching replication'],
      error: ['Query timed out', 'Constraint failed'],
    },
  },
  {
    id: 'web-tools-builder',
    name: 'Web Tools Builder',
    role: 'Builder',
    palette: 3,
    demoActions: {
      working: ['Shipping a widget', 'Wiring an API'],
      reading: ['Reading the spec', 'Checking a response'],
      waiting: ['Waiting on review', 'Deploy queued'],
      idle: ['Build green', 'Sketching the next tool'],
      error: ['Build failed', 'CORS again'],
    },
  },
  {
    id: 'designer',
    name: 'Designer',
    role: 'Design',
    palette: 4,
    demoActions: {
      working: ['Pushing pixels', 'Tuning a palette'],
      reading: ['Reviewing a mock', 'Studying a reference'],
      waiting: ['Waiting on feedback', 'Type on hold'],
      idle: ['Moodboard idle', 'Stretching'],
      error: ['Export failed', 'Font missing'],
    },
  },
  {
    id: 'personal-helper',
    name: 'Personal Helper',
    role: 'Ops',
    palette: 5,
    demoActions: {
      working: ['Booking a slot', 'Drafting a reply'],
      reading: ['Checking the list', 'Reading a reminder'],
      waiting: ['Waiting on Tong', 'Errand paused'],
      idle: ['Inbox zero', 'Kettle on'],
      error: ['Double-booked', 'Address missing'],
    },
  },
  {
    id: 'learning-machine',
    name: 'Learning Machine',
    role: 'Research',
    palette: 1,
    hueShift: 80,
    demoActions: {
      working: ['Taking notes', 'Writing a summary'],
      reading: ['Reading a paper', 'Highlighting a thread'],
      waiting: ['Waiting on a source', 'Quiz queued'],
      idle: ['Flashcards done', 'Staring at the board'],
      error: ['Link dead', 'Paywall'],
    },
  },
];
