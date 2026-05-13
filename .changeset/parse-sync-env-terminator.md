---
"@bomb.sh/args": minor
---

New features alongside the Standard Schema rewrite:

- **`parseSync(argv)`** — synchronous parsing with no schema validation, returns `RawArgs`.
- **`ParseError`** — thrown by `parse()` on schema validation failure. Carries a typed `issues: ReadonlyArray<StandardSchemaV1.Issue>` array.
- **`env` option** — `env: { prefix: 'APP' }` auto-injects `APP_*` environment variables as flag defaults before schema validation. Argv takes precedence.
- **`--` terminator** — all arguments after `--` are collected into `_` verbatim, not parsed as flags.
- **Typed positionals** — define `_` in your schema for full type safety (`z.tuple([z.string()])` for fixed-length, `z.array(z.string())` for variadic).
