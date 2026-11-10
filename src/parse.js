/**
 * Parse dotenv text into entries without ever printing values.
 * Handles: comments, blank lines, `export KEY=`, single/double quotes,
 * multi-line double-quoted values, inline comments after unquoted values.
 */
export function parseDotenv(text) {
  const entries = []; // { key, value, line, quoted }
  const errors = []; // { line, message }
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trimmed = raw.trim();
    i++;
    if (!trimmed || trimmed.startsWith('#')) continue;

    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*(=|:)\s*(.*)$/.exec(trimmed);
    if (!m) {
      errors.push({ line: lineNo, message: `cannot parse line: ${trimmed.slice(0, 40)}` });
      continue;
    }
    const key = m[1];
    let rest = m[3];
    let value;
    let quoted = null;

    if (rest.startsWith('"')) {
      quoted = '"';
      // collect until closing unescaped quote, possibly across lines
      let body = rest.slice(1);
      let closed = false;
      for (;;) {
        const idx = findUnescapedQuote(body, '"');
        if (idx !== -1) {
          value = body.slice(0, idx);
          closed = true;
          break;
        }
        if (i >= lines.length) break;
        body += '\n' + lines[i];
        i++;
      }
      if (!closed) {
        errors.push({ line: lineNo, message: `unterminated double quote for ${key}` });
        value = body;
      }
      value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else if (rest.startsWith("'")) {
      quoted = "'";
      const idx = rest.indexOf("'", 1);
      if (idx === -1) {
        errors.push({ line: lineNo, message: `unterminated single quote for ${key}` });
        value = rest.slice(1);
      } else {
        value = rest.slice(1, idx);
      }
    } else {
      // strip inline comment: " #..." preceded by whitespace
      const hash = rest.search(/\s#/);
      if (hash !== -1) rest = rest.slice(0, hash);
      value = rest.trim();
    }
    entries.push({ key, value, line: lineNo, quoted });
  }
  return { entries, errors };
}

function findUnescapedQuote(s, q) {
  for (let j = 0; j < s.length; j++) {
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === q) return j;
  }
  return -1;
}

/** Map of key -> last entry. Also returns the duplicate keys with all their lines. */
export function indexEntries(entries) {
  const byKey = new Map();
  const seen = new Map();
  for (const e of entries) {
    if (!seen.has(e.key)) seen.set(e.key, []);
    seen.get(e.key).push(e.line);
    byKey.set(e.key, e);
  }
  const duplicates = [...seen].filter(([, lines]) => lines.length > 1).map(([key, lines]) => ({ key, lines }));
  return { byKey, duplicates };
}
