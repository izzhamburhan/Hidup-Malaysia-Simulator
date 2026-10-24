import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Pig and pork, alcohol, and gambling imagery are not used anywhere in the game.
const BANNED = ['🐷', '🐖', '🐽', '🐗', '🥓', '🍺', '🍻', '🍷', '🍸', '🥂', '🍾', '🥃', '🍹', '🍶', '🎰', '🃏'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx|css|html|json)$/.test(name) ? [path] : [];
  });
}

describe('content', () => {
  it('uses no pig, pork, alcohol or gambling emoji', () => {
    const hits: string[] = [];
    for (const f of [...files('src'), 'index.html']) {
      const text = readFileSync(f, 'utf8');
      for (const e of BANNED) if (text.includes(e)) hits.push(`${f}: ${e}`);
    }
    expect(hits).toEqual([]);
  });
});