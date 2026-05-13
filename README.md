# `@bomb.sh/args`

A <1kB library for parsing CLI flags with first-class schema validation.

### Features

🤏 very small

🍃 very simple

🏃 very fast (beats [`node:util`](https://nodejs.org/api/util.html#utilparseargsconfig))

🔏 strongly typed via [`@standard-schema/spec`](https://standardschema.dev/)

🧩 works with any schema library (Zod, Valibot, Arktype, or built-ins)

---

## Usage

### Basic (no schema)

```ts
import { parseSync } from "@bomb.sh/args";

// my-cli build --bundle -rf --a value --b=value --c 1
const args = parseSync(process.argv.slice(2));
// { _: ['build'], bundle: true, r: true, f: true, a: "value", b: "value", c: 1 }
```

### With schema (async)

Pass any [`@standard-schema/spec`](https://standardschema.dev/)-compliant schema to `parse()` for validation and strong type inference. Works with [Zod](https://zod.dev), [Valibot](https://valibot.dev), [Arktype](https://arktype.io), and more.

```ts
import { parse } from "@bomb.sh/args";
import { z } from "zod";

const args = await parse(process.argv.slice(2), {
  schema: z.object({
    port: z.coerce.number().default(3000),
    verbose: z.boolean().default(false),
  }),
  alias: { v: "verbose" },
});

// args.port → number
// args.verbose → boolean
```

### Built-in schema primitives

No Zod? No problem. Import from `@bomb.sh/args/schema` for zero-dependency validation.

```ts
import { parse } from "@bomb.sh/args";
import { object, number, boolean, string, array } from "@bomb.sh/args/schema";

const args = await parse(process.argv.slice(2), {
  schema: object({
    port: number(),
    verbose: boolean(),
    tags: array(string()),
  }),
});
```

### Per-field aliases and docs

Built-in primitives support chainable `.alias()` and `.docs()` methods. Aliases registered on fields are automatically wired into `parse()` — no manual `alias` map needed.

```ts
import { parse } from "@bomb.sh/args";
import { object, number, boolean, string } from "@bomb.sh/args/schema";

const args = await parse(process.argv.slice(2), {
  schema: object({
    port: number().alias("p").docs("Port to listen on"),
    verbose: boolean().alias("v").docs("Enable verbose output"),
  }),
});

// parse(["-p", "3000"]) → { port: 3000 }
// parse(["-v"])         → { verbose: true }
```

### camelCase ↔ kebab-case auto-normalization

`parse()` automatically resolves camelCase ↔ kebab-case flag variants when using an `object()` schema. No aliases required — `--moduleTypes` and `--module-types` both resolve to the same field.

```ts
const args = await parse(["--module-types", "esm"], {
  schema: object({ moduleTypes: string() }),
});
// args.moduleTypes → "esm"

const args2 = await parse(["--moduleTypes", "esm"], {
  schema: object({ moduleTypes: string() }),
});
// args2.moduleTypes → "esm"
```

### Boolean negation

Flags prefixed with `--no-` are automatically treated as `false` for the base flag name.

```ts
// my-cli --no-verbose
// args.verbose → false
```

### Nested flags

Dotted flag names create nested output objects.

```ts
// my-cli --output.dir dist --output.format esm
// args.output → { dir: "dist", format: "esm" }
```

### `=` syntax

Both `--flag value` and `--flag=value` forms are supported.

```ts
// my-cli --port=3000
// my-cli --port 3000
// Both → args.port → 3000
```

---

## ParseOptions

```ts
interface ParseOptions {
  /** Standard Schema-compliant schema. Drives return type and validation. */
  schema?: StandardSchemaV1;

  /**
   * Map short flags to long names. When using built-in schema primitives,
   * prefer per-field .alias() instead. Manual aliases take precedence on conflict.
   */
  alias?: Record<string, string>;

  /**
   * Auto-inject environment variables as flag defaults before validation.
   * --foo-bar maps to PREFIX_FOO_BAR (uppercased, hyphens → underscores).
   */
  env?: false | { prefix: string };
}
```

---

## Positional arguments

Positionals land in `_` on the raw parsed object. Define `_` in your schema for full type safety.

```ts
import { z } from "zod";

const args = await parse(process.argv.slice(2), {
  schema: z.object({
    _: z.tuple([z.string()]),  // first positional is a required string
    port: z.coerce.number().default(3000),
  }),
});

// args._[0] → string (typed!)
```

Use `z.array()` for variadic positionals:

```ts
schema: z.object({
  _: z.array(z.string()),
  // ...
})
```

### `--` terminator

Everything after `--` is collected into `_` verbatim, not parsed as flags.

```
my-cli --verbose -- --not-a-flag file.txt
```

```ts
// args.verbose → true
// args._ → ["--not-a-flag", "file.txt"]
```

---

## Environment variable fallback

When `env: { prefix }` is set, any `PREFIX_FLAG_NAME` env var is injected as a default for missing flags before schema validation.

```ts
// APP_PORT=9000 my-cli
const args = await parse([], {
  schema: z.object({ port: z.coerce.number() }),
  env: { prefix: "APP" },
});
// args.port → 9000
```

Argv always takes precedence over env vars.

---

## Error handling

```ts
import { parse, ParseError } from "@bomb.sh/args";

try {
  const args = await parse(argv, { schema });
} catch (e) {
  if (e instanceof ParseError) {
    for (const issue of e.issues) {
      console.error(issue.message);
    }
  }
}
```

---

## `@bomb.sh/args/schema`

Built-in schema primitives that implement `@standard-schema/spec`. Composable with other schema libraries or usable standalone.

### Primitives

```ts
import { string, number, boolean, array, object } from "@bomb.sh/args/schema";
```

| Primitive | Input | Output |
|-----------|-------|--------|
| `string()` | `string \| number \| boolean` | `string` |
| `number()` | `number \| string` (coerces numeric strings) | `number` |
| `boolean()` | `boolean \| "true" \| "false" \| "1" \| "0"` | `boolean` |
| `array(item?)` | `unknown[]` | `T[]` |
| `object(shape)` | `object` | `{ [K]: OutputType }` |

All primitives support `.docs(description)` and `.alias(...names)` for metadata and per-field alias registration.

---

## `parseSync()`

Synchronous parsing with no schema validation. Returns `RawArgs`.

```ts
import { parseSync } from "@bomb.sh/args";

const args = parseSync(process.argv.slice(2), {
  alias: { v: "verbose" },
  env: { prefix: "APP" },
});
// args.verbose → string | number | boolean | undefined
```

---

## Benchmarks

```
mri               x 1,650,986 ops/sec ±0.32% (97 runs sampled)
@bomb.sh/args     x 1,407,191 ops/sec ±0.38% (99 runs sampled)
minimist          x 383,506 ops/sec ±0.28% (99 runs sampled)
node:util         x 320,953 ops/sec ±0.35% (98 runs sampled)
yargs-parser      x 31,874 ops/sec ±1.32% (92 runs sampled)
```

## Acknowledgements

This package was previously published as `ultraflag` up until `v0.3.0`, when it was renamed to `@bomb.sh/args`.
