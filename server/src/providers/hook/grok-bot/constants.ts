/**
 * Grok Bot provider constants. Kept next to the provider so Claude-specific
 * files never import them (same pattern as providers/hook/claude/constants.ts).
 */

export const GROK_BOT_PROVIDER_ID = 'grok-bot';
export const GROK_BOT_DISPLAY_NAME = 'Grok Bot';

/** Session-id prefix so Grok Bot agents never collide with Claude UUIDs. */
export const GROK_BOT_SESSION_PREFIX = 'grok-bot:';

/** Default JSON feed path under ~/.pixel-agents/ when --feed is omitted. */
export const GROK_BOT_DEFAULT_FEED_NAME = 'grok-bot-feed.json';

/** How often the file feed is re-read. */
export const GROK_BOT_FEED_POLL_MS = 750;

/** How often demo mode picks a new activity for one bot. */
export const GROK_BOT_DEMO_TICK_MS = 3500;

/** Wire statuses a local feed may send. */
export const GROK_BOT_STATUSES = ['working', 'reading', 'waiting', 'idle', 'error'] as const;
export type GrokBotStatus = (typeof GROK_BOT_STATUSES)[number];

/** Bundled office scenes. `office` is the default layout; `garden` is the
 *  alternate park scene. */
export const OFFICE_THEMES = ['office', 'garden'] as const;
export type OfficeTheme = (typeof OFFICE_THEMES)[number];

export const DEFAULT_OFFICE_THEME: OfficeTheme = 'office';
