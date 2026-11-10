# dotenv-guard

**Catch the missing env var before the deploy does.** A zero-dependency CLI that checks `.env` against `.env.example`, diffs environments by key, and never prints a value.

```
$ npx dotenv-guard check
error  .env:4   DATABASE_URL is empty
error  .env     STRIPE_WEBHOOK_SECRET is in the example but not in the env file
error  .env:9   SMTP_PASSWORD still has a placeholder value
warn   .env:12  LEGACY_FLAG is set but not documented in the example
3 errors, 1 warning
```

Exit code 1, so it fails your CI step or pre-commit hook.

## Why

Every team has a `.env.example`. Nobody keeps it in sync. The failure shows up as a crash in staging or an `undefined` in a URL, hours after the key was added. The fix is a check that runs where the drift happens: before commit and in CI. Existing tools either load the env into a process (and can log it) or need Rust or Python installed. This one is a single Node file with no dependencies, and it is designed so that secret values never appear in its output, its JSON, or its exit messages.

## Install

```bash
npx dotenv-guard check              # no install
npm i -D dotenv-guard               # per project
```

Node 20+.

## Commands

### `check`

```bash
dotenv-guard check [--example .env.example] [--env .env] [--allow-extra] [--allow-empty KEY,KEY] [--json] [--github]
```

| Finding | Level | Meaning |
|---|---|---|
| missing | error | Key in the example, not in the env file |
| empty | error | Key present with no value (`KEY=`) |
| placeholder | error | Value looks like `changeme`, `<your-key>`, `xxx`, `TODO` |
| syntax | error | Line that is not `KEY=value`, or unterminated quote |
| extra | warning | Key in the env file but not in the example (`--allow-extra` to silence) |
| duplicate | warning | Key defined twice; the last one wins |

`--github` prints `::error file=.env,line=4::...` annotations so the problems show up inline on the PR.

### `diff`

```bash
dotenv-guard diff .env.staging .env.production
```

```
- DEBUG_TOOLBAR   (only in .env.staging)
+ CDN_URL         (only in .env.production)
~ DATABASE_URL    (different value)
7 same, 1 changed, 2 missing on one side
```

Keys and whether the values differ. Never the values.

### `example`

```bash
dotenv-guard example --env .env > .env.example
```

Generates an example file from a real one: same keys and comments, values blanked.

## In CI

```yaml
- run: npx dotenv-guard check --example .env.example --env .env.ci --github
```

## As a pre-commit hook

With [husky](https://typicode.github.io/husky/) or any hook runner:

```bash
npx dotenv-guard check --allow-extra
```

## Parsing rules

Follows the common dotenv dialect: `#` comments, blank lines, optional `export`, single and double quotes, multi-line double-quoted values, `\n` and `\"` escapes inside double quotes, inline comments after unquoted values. Both `=` and `:` separators are accepted.

## Library

```js
import { check, diff, makeExample, parseDotenv } from 'dotenv-guard';

const result = check({ exampleText, envText, allowExtra: true });
if (!result.ok) console.log(result.problems);
```

## Contributing

`npm test` runs everything with Node's built-in runner, nothing to install. Ideas that would help: a `--schema` mode that validates value shape (url, int, bool) from comments in the example, a `.dotenv-guardrc`, and Windows path tests. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
