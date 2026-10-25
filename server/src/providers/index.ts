/**
 * Provider registry: re-exports all bundled providers.
 *
 * Adding a new CLI provider:
 *   1. Create `server/src/providers/hook/<cli>/<cli>.ts` implementing HookProvider.
 *      (File-based and stream-based provider types will land when the first such
 *       provider ships.)
 *   2. Add an export line below.
 *
 * The adapter (VS Code extension, standalone CLI, etc.) imports from here rather
 * than reaching into each provider directory directly.
 */

import type { HookProvider } from '../../../core/src/provider.js';
import { claudeProvider } from './hook/claude/claude.js';
import { grokBotProvider } from './hook/grok-bot/grokBot.js';

export { claudeProvider };
export { grokBotProvider };
export { copyHookScript } from './hook/claude/claudeHookInstaller.js';

/** Every bundled hook provider the consent gate asks about. Grok Bot is
 *  registered with the runtime (it never writes a third-party settings file)
 *  but is not in this list, so the Intro does not grow a second ask. */
export const hookProviders: readonly HookProvider[] = [claudeProvider];

/** Providers the runtime can dispatch hook / feed events for. */
export const runtimeProviders: readonly HookProvider[] = [claudeProvider, grokBotProvider];

/** Resolve a wire-supplied provider id, or undefined for an unknown one —
 *  the caller writes nothing on undefined (fail-closed, like a junk choice). */
export function hookProviderById(id: unknown): HookProvider | undefined {
  return typeof id === 'string' ? hookProviders.find((p) => p.id === id) : undefined;
}
