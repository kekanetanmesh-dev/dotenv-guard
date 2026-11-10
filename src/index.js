import { readFileSync } from 'node:fs';
import { parseDotenv, indexEntries } from './parse.js';

export { parseDotenv, indexEntries };

const PLACEHOLDER = /^(?:<.*>|your[_-]?.*|changeme|change[_-]me|xxx+|todo|replace[_-]?me|\.\.\.|placeholder)$/i;

/**
 * Compare an env file against an example file.
 * Never returns values of the env file, only keys and line numbers.
 */
export function check({ exampleText, envText, allowExtra = false, allowEmpty = [] }) {
  const example = parseDotenv(exampleText);
  const env = parseDotenv(envText);
  const exIdx = indexEntries(example.entries);
  const envIdx = indexEntries(env.entries);
  const allowEmptySet = new Set(allowEmpty);

  const problems = [];
  for (const key of exIdx.byKey.keys()) {
    if (!envIdx.byKey.has(key)) problems.push({ type: 'missing', key, severity: 'error', message: `${key} is in the example but not in the env file` });
  }
  if (!allowExtra) {
    for (const key of envIdx.byKey.keys()) {
      if (!exIdx.byKey.has(key)) problems.push({ type: 'extra', key, line: envIdx.byKey.get(key).line, severity: 'warning', message: `${key} is set but not documented in the example` });
    }
  }
  for (const e of env.entries) {
    if (e.value === '' && exIdx.byKey.has(e.key) && !allowEmptySet.has(e.key)) {
      problems.push({ type: 'empty', key: e.key, line: e.line, severity: 'error', message: `${e.key} is empty` });
    } else if (PLACEHOLDER.test(e.value) && exIdx.byKey.has(e.key)) {
      problems.push({ type: 'placeholder', key: e.key, line: e.line, severity: 'error', message: `${e.key} still has a placeholder value` });
    }
  }
  for (const d of envIdx.duplicates) {
    problems.push({ type: 'duplicate', key: d.key, line: d.lines[d.lines.length - 1], severity: 'warning', message: `${d.key} is defined ${d.lines.length} times (lines ${d.lines.join(', ')}); the last one wins` });
  }
  for (const d of exIdx.duplicates) {
    problems.push({ type: 'duplicate-example', key: d.key, line: d.lines[d.lines.length - 1], severity: 'warning', message: `${d.key} is defined ${d.lines.length} times in the example` });
  }
  for (const err of env.errors) problems.push({ type: 'syntax', severity: 'error', line: err.line, message: err.message });
  for (const err of example.errors) problems.push({ type: 'syntax-example', severity: 'error', line: err.line, message: err.message });

  const order = { error: 0, warning: 1 };
  problems.sort((a, b) => order[a.severity] - order[b.severity] || (a.line || 0) - (b.line || 0));
  return {
    ok: !problems.some((p) => p.severity === 'error'),
    problems,
    counts: { example: exIdx.byKey.size, env: envIdx.byKey.size },
  };
}

/**
 * Diff two env files by key: which keys only one has, which values differ.
 * Values are never included in the output, only whether they differ.
 */
export function diff(aText, bText) {
  const a = indexEntries(parseDotenv(aText).entries).byKey;
  const b = indexEntries(parseDotenv(bText).entries).byKey;
  const onlyA = [...a.keys()].filter((k) => !b.has(k));
  const onlyB = [...b.keys()].filter((k) => !a.has(k));
  const changed = [...a.keys()].filter((k) => b.has(k) && a.get(k).value !== b.get(k).value);
  const same = [...a.keys()].filter((k) => b.has(k) && a.get(k).value === b.get(k).value);
  return { onlyA, onlyB, changed, same, identical: !onlyA.length && !onlyB.length && !changed.length };
}

/** Produce an example file from an env file: same keys, values blanked. Keeps comments. */
export function makeExample(envText) {
  const out = [];
  for (const line of envText.split(/\r?\n/)) {
    const m = /^(\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_.-]*\s*=)/.exec(line);
    if (m) out.push(m[1]);
    else out.push(line);
  }
  return out.join('\n');
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}
