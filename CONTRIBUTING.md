# Contributing

Small, focused PRs are the easiest to review and merge.

## Setup

```bash
git clone https://github.com/kekanetanmesh-dev/dotenv-guard
cd dotenv-guard
npm test
```

No dependencies, no build step.

## Ground rules

- **Never print a value.** Output, JSON and error messages may contain keys and line numbers only. A test that asserts this exists; keep it green.
- Keep it zero-dependency.
- Add or update a test for any behaviour change.

## Good first issues

- `--schema`: read `# type: url` style comments from the example and validate value shape.
- Config file support (`.dotenv-guardrc.json`).
- A `--fix` for `check` that appends missing keys to `.env` with empty values.
- Windows line endings and path tests.
