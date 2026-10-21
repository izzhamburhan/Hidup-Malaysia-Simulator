// Shared helpers for the Claude/Codex skill twins. The Claude copy is the source of truth.
// Node built-ins only. Used by sync-codex-skills.mjs and check-skill-parity.mjs.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLAUDE_DIR = '.claude/skills';
export const CODEX_DIR = '.codex/skills';
export const SKILL_FILE = 'SKILL.md';
export const OPENAI_YAML = 'agents/openai.yaml';
export const SHORT_DESCRIPTION_MAX = 110;
export const PROJECT_NAME = 'HIDUP MALAYSIA';

const ACRONYMS = { tdd: 'TDD', mcp: 'MCP', ui: 'UI' };

/** Repo root: the parent of the scripts/ folder. */
export function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

/** Read a text file with newlines normalised to \n (like Python's universal newlines). */
export function readText(file) {
  return readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
}

/** Codex reads AGENTS.md. Lines that already name AGENTS.md are left alone. */
export function toCodex(text) {
  return text
    .split('\n')
    .map((line) => (line.includes('AGENTS.md') ? line : line.replaceAll('CLAUDE.md', 'AGENTS.md')))
    .join('\n');
}

/** Parse the simple `key: value` frontmatter block at the top of a SKILL.md. */
export function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    const key = idx === -1 ? line : line.slice(0, idx);
    const value = idx === -1 ? '' : line.slice(idx + 1);
    fields[key.trim()] = value.trim();
  }
  return fields;
}

function shortDescription(description) {
  const first = description.split(/(?<=[.!?])\s/)[0].replace(/\.+$/, '');
  const chars = Array.from(first);
  if (chars.length <= SHORT_DESCRIPTION_MAX) return first;
  return chars.slice(0, SHORT_DESCRIPTION_MAX - 3).join('').trimEnd() + '...';
}

function titleCase(name) {
  return name
    .split('-')
    .map((word) => ACRONYMS[word] ?? (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

/** The agents/openai.yaml text Codex needs for a skill. */
export function openaiYaml(name, description) {
  const prompt = `Use $${name} to handle this ${PROJECT_NAME} task.`;
  return (
    'interface:\n' +
    `  display_name: ${JSON.stringify(titleCase(name))}\n` +
    `  short_description: ${JSON.stringify(shortDescription(description))}\n` +
    `  default_prompt: ${JSON.stringify(prompt)}\n` +
    '\n' +
    'policy:\n' +
    '  allow_implicit_invocation: true\n'
  );
}

/** Sorted names of the skill folders under root/base. */
export function skillNames(root, base) {
  const folder = path.join(root, base);
  if (!existsSync(folder) || !statSync(folder).isDirectory()) return [];
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** [SKILL.md text, openai.yaml text] the Codex twin must have for a Claude skill. */
export function expectedTwin(root, name) {
  const source = readText(path.join(root, CLAUDE_DIR, name, SKILL_FILE));
  const meta = frontmatter(source);
  return [toCodex(source), openaiYaml(name, meta.description ?? '')];
}
