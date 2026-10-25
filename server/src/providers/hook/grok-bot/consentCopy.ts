/**
 * Consent copy for the Grok Bot provider. The interface requires it, but this
 * provider never writes another tool's settings file — areHooksInstalled() is
 * always true — so the Intro never asks. The strings stay honest in case a
 * future gate change surfaces them.
 */

export const CONSENT_INSTALL_HEADLINE = 'Grok Bot status feed';

export const CONSENT_DISCLOSURE = [
  "Pixel Agents can show Tong's Grok Bot teammates from a local JSON file or an HTTP POST to this machine. Nothing is written into another tool's settings.",
  'A status update may include a bot name, a status (working, reading, waiting, idle, error), and a short last-action label. The feed stays on this host unless you bind the server past loopback.',
  'Demo mode seeds a local roster when no live feed is connected. You can stop it with --no-demo.',
].join('\n\n');
