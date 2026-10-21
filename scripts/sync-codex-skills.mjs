// Regenerate .codex/skills from .claude/skills. Edit the Claude copy, then run this.
//
// Usage: npm run skills:sync   (or: node scripts/sync-codex-skills.mjs)

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CLAUDE_DIR, CODEX_DIR, OPENAI_YAML, SKILL_FILE, expectedTwin, repoRoot, skillNames } from './skills-lib.mjs';

export function sync(root) {
  const written = [];
  const claude = skillNames(root, CLAUDE_DIR);
  for (const name of claude) {
    const [skillText, yamlText] = expectedTwin(root, name);
    const target = path.join(root, CODEX_DIR, name);
    mkdirSync(path.dirname(path.join(target, OPENAI_YAML)), { recursive: true });
    writeFileSync(path.join(target, SKILL_FILE), skillText, 'utf8');
    writeFileSync(path.join(target, OPENAI_YAML), yamlText, 'utf8');
    written.push(name);
  }
  for (const name of skillNames(root, CODEX_DIR)) {
    if (!claude.includes(name)) {
      rmSync(path.join(root, CODEX_DIR, name), { recursive: true, force: true });
      console.log(`removed orphan Codex skill: ${name}`);
    }
  }
  return written;
}

const written = sync(repoRoot());
console.log(`Synced ${written.length} skills to ${CODEX_DIR}`);
