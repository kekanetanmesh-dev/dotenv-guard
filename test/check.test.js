import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, diff, makeExample } from '../src/index.js';
import { formatCheck, formatDiff, parseArgs } from '../src/cli.js';

const example = 'DB_URL=\nAPI_KEY=\nPORT=3000\nOPTIONAL=\n';

test('check: missing, empty, placeholder, extra, duplicate', () => {
  const env = 'DB_URL=postgres://x\nAPI_KEY=changeme\nPORT=\nEXTRA=1\nEXTRA=2\n';
  const r = check({ exampleText: example, envText: env });
  assert.equal(r.ok, false);
  const types = r.problems.map((p) => `${p.type}:${p.key}`);
  assert.deepEqual(types.sort(), ['duplicate:EXTRA', 'empty:PORT', 'extra:EXTRA', 'missing:OPTIONAL', 'placeholder:API_KEY'].sort());
  // never leaks the value
  assert.equal(JSON.stringify(r).includes('postgres://x'), false);
});

test('check: passes with allow-extra and allow-empty', () => {
  const env = 'DB_URL=a\nAPI_KEY=b\nPORT=1\nOPTIONAL=\nEXTRA=1\n';
  const r = check({ exampleText: example, envText: env, allowExtra: true, allowEmpty: ['OPTIONAL'] });
  assert.equal(r.ok, true);
  assert.equal(r.problems.length, 0);
});

test('check: syntax errors are errors', () => {
  const r = check({ exampleText: example, envText: 'garbage line\nDB_URL=a\nAPI_KEY=b\nPORT=1\nOPTIONAL=x' });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].type, 'syntax');
});

test('diff: keys only, no values', () => {
  const d = diff('A=1\nB=2\nC=3', 'A=1\nB=9\nD=4');
  assert.deepEqual(d.onlyA, ['C']);
  assert.deepEqual(d.onlyB, ['D']);
  assert.deepEqual(d.changed, ['B']);
  assert.deepEqual(d.same, ['A']);
  assert.equal(d.identical, false);
  assert.equal(JSON.stringify(d).includes('9'), false);
});

test('makeExample blanks values and keeps comments', () => {
  assert.equal(makeExample('# db\nDB_URL="secret"\nexport TOKEN=abc\n\nPORT=3000'), '# db\nDB_URL=\nexport TOKEN=\n\nPORT=');
});

test('formatters and args', () => {
  const r = check({ exampleText: 'A=\n', envText: '' });
  const plain = formatCheck(r, { envPath: '.env', examplePath: '.env.example' });
  assert.match(plain, /A is in the example but not in the env file/);
  assert.match(plain, /1 error, 0 warnings/);
  const gh = formatCheck(r, { envPath: '.env', examplePath: '.env.example', github: true });
  assert.match(gh, /^::error file=\.env::A is in the example/m);
  assert.match(formatDiff(diff('A=1', 'A=1'), 'a', 'b'), /identical: 1 keys/);
  const o = parseArgs(['check', '--env', 'x', '--allow-empty', 'A, B', '--github']);
  assert.equal(o.cmd, 'check');
  assert.equal(o.env, 'x');
  assert.deepEqual(o.allowEmpty, ['A', 'B']);
  assert.equal(o.github, true);
  assert.throws(() => parseArgs(['--zzz']), /Unknown option/);
});
