import * as fs from 'fs';
import * as path from 'path';

import {
  DEFAULT_OFFICE_THEME,
  OFFICE_THEMES,
  type OfficeTheme,
} from './providers/hook/grok-bot/constants.js';

export { DEFAULT_OFFICE_THEME, OFFICE_THEMES, type OfficeTheme };

export function isOfficeTheme(value: unknown): value is OfficeTheme {
  return typeof value === 'string' && (OFFICE_THEMES as readonly string[]).includes(value);
}

/**
 * Load a bundled scene layout from dist/assets (or the webview public assets
 * tree during tests). `office` is the versioned default-layout; `garden` is
 * the alternate park scene.
 */
export function loadThemeLayout(
  assetsRoot: string,
  theme: OfficeTheme,
): Record<string, unknown> | null {
  const assetsDir = path.join(assetsRoot, 'assets');
  const file =
    theme === 'garden'
      ? path.join(assetsDir, 'scenes', 'garden.json')
      : newestDefaultLayout(assetsDir);
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    console.error(`[Pixel Agents] Failed to read ${theme} scene:`, err);
    return null;
  }
}

function newestDefaultLayout(assetsDir: string): string | null {
  try {
    let best: { n: number; file: string } | null = null;
    for (const name of fs.readdirSync(assetsDir)) {
      const match = /^default-layout-(\d+)\.json$/.exec(name);
      if (!match) continue;
      const n = Number(match[1]);
      if (!best || n > best.n) best = { n, file: path.join(assetsDir, name) };
    }
    if (best) return best.file;
    const fallback = path.join(assetsDir, 'default-layout.json');
    return fs.existsSync(fallback) ? fallback : null;
  } catch {
    return null;
  }
}
