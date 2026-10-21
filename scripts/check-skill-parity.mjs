// Fail when .codex/skills is not an exact regeneration of .claude/skills.
//
// Usage: npm run skills:check   (or: node scripts/check-skill-parity.mjs)
// Fix:   npm run skills:sync

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  CLAUDE_DIR,
  CODEX_DIR,
  OPENAI_YAML,
  SKILL_FILE,
  expectedTwin,
  frontmatter,
  readText,
  repoRoot,
  skillNames,
} from './skills-lib.mjs';

const isFile = (file) => existsSync(file) && statSync(file).isFile();

export function check(root) {
  const problems = [];
  const claude = skillNames(root, CLAUDE_DIR);
  const codex = skillNames(root, CODEX_DIR);
  for (const n of claude) if (!codex.includes(n)) problems.push(`${n}: missing under ${CODEX_DIR}`);
  for (const n of codex) if (!claude.includes(n)) problems.push(`${n}: exists under ${CODEX_DIR} but not under ${CLAUDE_DIR}`);
  for (const name of claude) {
    const source = path.join(root, CLAUDE_DIR, name, SKILL_FILE);
    if (!isFile(source)) {
      problems.push(`${name}: no ${SKILL_FILE} under ${CLAUDE_DIR}`);
      continue;
    }
    const meta = frontmatter(readText(source));
    if (meta.name !== name) {
      problems.push(`${name}: frontmatter name is ${JSON.stringify(meta.name ?? null)}, expected ${JSON.stringify(name)}`);
    }
    if (!meta.description) {
      problems.push(`${name}: frontmatter description is missing`);
    } else if (!meta.description.startsWith('Use when')) {
      problems.push(`${name}: frontmatter description must start with "Use when"`);
    }
    if (!codex.includes(name)) continue;
    const [skillText, yamlText] = expectedTwin(root, name);
    for (const [rel, expected] of [
      [SKILL_FILE, skillText],
      [OPENAI_YAML, yamlText],
    ]) {
      const file = path.join(root, CODEX_DIR, name, rel);
      if (!isFile(file)) {
        problems.push(`${name}: missing ${CODEX_DIR}/${name}/${rel}`);
      } else if (readText(file) !== expected) {
        problems.push(`${name}: ${rel} differs from the Claude skill (run npm run skills:sync)`);
      }
    }
  }
  return problems;
}

const root = repoRoot();
const problems = check(root);
for (const problem of problems) console.error(`skill-parity: ${problem}`);
if (problems.length) {
  process.exitCode = 1;
} else {
  console.log(`skill-parity: ${skillNames(root, CLAUDE_DIR).length} skills in sync`);
}
