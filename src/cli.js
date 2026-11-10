#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { check, diff, makeExample, readText } from './index.js';

const HELP = `dotenv-guard — keep .env files honest without printing a single secret

Usage:
  dotenv-guard check [--example .env.example] [--env .env] [--allow-extra] [--allow-empty KEY,KEY] [--json] [--github]
  dotenv-guard diff <a.env> <b.env> [--json]
  dotenv-guard example [--env .env]        # print a .env.example with values blanked

check   Fails (exit 1) on keys missing from .env, empty or placeholder values,
        and syntax errors. Warns on extra and duplicate keys.
diff    Shows which keys differ between two env files. Values are never shown.
example Generate an example file from a real one.

Options:
  --example PATH   Example file (default .env.example)
  --env PATH       Env file (default .env)
  --allow-extra    Don't warn about keys that are not in the example
  --allow-empty    Comma-separated keys that may be empty
  --json           Machine-readable output
  --github         Emit GitHub Actions annotations
  -h, --help       Show this help
`;

export function parseArgs(argv) {
  const o = { cmd: null, example: '.env.example', env: '.env', allowExtra: false, allowEmpty: [], json: false, github: false, help: false, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--example') o.example = argv[++i];
    else if (a === '--env') o.env = argv[++i];
    else if (a === '--allow-extra') o.allowExtra = true;
    else if (a === '--allow-empty') o.allowEmpty = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--json') o.json = true;
    else if (a === '--github') o.github = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
    else if (!o.cmd) o.cmd = a;
    else o.positional.push(a);
  }
  return o;
}

export function formatCheck(result, { envPath, examplePath, github = false }) {
  const lines = [];
  if (github) {
    for (const p of result.problems) {
      const level = p.severity === 'error' ? 'error' : 'warning';
      const loc = p.line ? `file=${envPath},line=${p.line}` : `file=${envPath}`;
      lines.push(`::${level} ${loc}::${p.message}`);
    }
  } else {
    for (const p of result.problems) {
      const where = p.line ? `${envPath}:${p.line}` : envPath;
      lines.push(`${p.severity === 'error' ? 'error' : 'warn '}  ${where}  ${p.message}`);
    }
  }
  const errors = result.problems.filter((p) => p.severity === 'error').length;
  const warnings = result.problems.length - errors;
  lines.push(result.ok
    ? `ok: ${envPath} has all ${result.counts.example} keys from ${examplePath}${warnings ? ` (${warnings} warning${warnings > 1 ? 's' : ''})` : ''}`
    : `${errors} error${errors > 1 ? 's' : ''}, ${warnings} warning${warnings === 1 ? '' : 's'}`);
  return lines.join('\n');
}

export function formatDiff(d, a, b) {
  const lines = [];
  for (const k of d.onlyA) lines.push(`- ${k}   (only in ${a})`);
  for (const k of d.onlyB) lines.push(`+ ${k}   (only in ${b})`);
  for (const k of d.changed) lines.push(`~ ${k}   (different value)`);
  lines.push(d.identical ? `identical: ${d.same.length} keys` : `${d.same.length} same, ${d.changed.length} changed, ${d.onlyA.length + d.onlyB.length} missing on one side`);
  return lines.join('\n');
}

function mustRead(path) {
  if (!existsSync(path)) {
    console.error(`error: ${path} not found`);
    process.exit(2);
  }
  return readText(path);
}

function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); console.error(HELP); process.exit(2); }
  if (o.help || !o.cmd) { console.log(HELP); process.exit(o.help ? 0 : 2); }

  if (o.cmd === 'check') {
    const exampleText = mustRead(o.example);
    const envText = mustRead(o.env);
    const r = check({ exampleText, envText, allowExtra: o.allowExtra, allowEmpty: o.allowEmpty });
    console.log(o.json ? JSON.stringify(r, null, 2) : formatCheck(r, { envPath: o.env, examplePath: o.example, github: o.github }));
    process.exit(r.ok ? 0 : 1);
  }
  if (o.cmd === 'diff') {
    const [a, b] = o.positional;
    if (!a || !b) { console.error('diff needs two files'); process.exit(2); }
    const d = diff(mustRead(a), mustRead(b));
    console.log(o.json ? JSON.stringify(d, null, 2) : formatDiff(d, a, b));
    process.exit(d.identical ? 0 : 1);
  }
  if (o.cmd === 'example') {
    process.stdout.write(makeExample(mustRead(o.env)) + '\n');
    process.exit(0);
  }
  console.error(`Unknown command: ${o.cmd}`);
  console.error(HELP);
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
