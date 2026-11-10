import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDotenv, indexEntries } from '../src/parse.js';

test('parses basic, export, quoted, inline comments', () => {
  const { entries, errors } = parseDotenv(`
# comment
A=1
export B=two
C="with space" # trailing
D='single # not comment'
E=unquoted # comment
F=
G="esc \\"q\\" and \\n newline"
`);
  assert.equal(errors.length, 0);
  const m = Object.fromEntries(entries.map((e) => [e.key, e.value]));
  assert.equal(m.A, '1');
  assert.equal(m.B, 'two');
  assert.equal(m.C, 'with space');
  assert.equal(m.D, 'single # not comment');
  assert.equal(m.E, 'unquoted');
  assert.equal(m.F, '');
  assert.equal(m.G, 'esc "q" and \n newline');
});

test('multi-line double quoted value', () => {
  const { entries, errors } = parseDotenv('KEY="line1\nline2"\nNEXT=x');
  assert.equal(errors.length, 0);
  assert.equal(entries[0].value, 'line1\nline2');
  assert.equal(entries[1].key, 'NEXT');
  assert.equal(entries[1].line, 3);
});

test('reports unparseable lines and unterminated quotes', () => {
  const { errors } = parseDotenv('not a pair\nX="open');
  assert.equal(errors.length, 2);
  assert.match(errors[0].message, /cannot parse/);
  assert.match(errors[1].message, /unterminated/);
});

test('indexEntries finds duplicates, last wins', () => {
  const { entries } = parseDotenv('A=1\nB=2\nA=3');
  const { byKey, duplicates } = indexEntries(entries);
  assert.equal(byKey.get('A').value, '3');
  assert.deepEqual(duplicates, [{ key: 'A', lines: [1, 3] }]);
});
