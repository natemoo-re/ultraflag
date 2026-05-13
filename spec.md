# Arg Parser — Design Specification

## Overview

A minimal, standalone TypeScript library for parsing CLI arguments with full type safety. Decoupled from any routing or framework layer. Accepts a spec string, a StandardSchema V1 flag schema, and an optional alias map. Returns a fully typed, validated context object.

---

## Package API

### `parse(argv, options)`

```ts
function parse<Spec extends string, Schema extends StandardSchemaV1>(
  argv: string[],
  options: {
    spec: Spec;
    schema: Schema;
    alias?: Record<
      string,
      keyof Schema["~types"]["input"] | ExtractSpecNames<Spec>
    >;
  },
): Promise<ParseResult<Spec, Schema>>;
```

The return type is a `Promise` because schema validation (via StandardSchema V1) may be async.

---

## Spec String

The `spec` string describes the full command signature using standard CLI notation, inspired by docopt and POSIX conventions. It is intended to be human-readable and suitable for direct use in help text.

### Notation

| Syntax      | Meaning                       | Output type (no schema override) |
| ----------- | ----------------------------- | -------------------------------- |
| `bare`      | Subcommand or literal segment | Not included in output           |
| `<name>`    | Required positional           | `string`                         |
| `[name]`    | Optional positional           | `string \| undefined`            |
| `[...name]` | Variadic positional           | `string[]`                       |

### Examples

```
'deploy <env> [region] [...targets]'
'git commit <message>'
'build'
```

### Rules

- Bare words are treated as subcommand names and are not included in the parsed output.
- Required positionals (`<name>`) must precede optional positionals (`[name]`).
- The variadic positional (`[...name]`) must be the terminal segment if present. Only one variadic positional is allowed per spec.
- Spec names are extracted at the type level to produce `ExtractSpecNames<Spec>`.

---

## Schema

The `schema` option accepts any StandardSchema V1-compatible schema (e.g. Zod, Valibot, ArkType). It serves two purposes:

1. **Flag definitions** — any key in the schema that does not appear in the spec is treated as a named flag.
2. **Positional type overrides** — any key in the schema that matches a positional name in the spec overrides the default `string` type for that positional.

### Positional Type Resolution

For each name extracted from the spec, the output type is resolved as follows:

| Spec form   | No schema entry       | Schema entry `T` | Schema entry `T[]` |
| ----------- | --------------------- | ---------------- | ------------------ |
| `<name>`    | `string`              | `T`              | `T[]`              |
| `[name]`    | `string \| undefined` | `T \| undefined` | `T[] \| undefined` |
| `[...name]` | `string[]`            | `T[]`            | `T[]` ← unwrapped  |

**Variadicity is always declared in the spec, never in the schema.** If a variadic spec entry (`[...name]`) maps to a schema entry of type `T[]`, the array is silently unwrapped to avoid `T[][]`. There is no CLI use case for a nested array output type.

A schema entry typed as `T[]` on a non-variadic positional is left as-is — the user is expected to handle their own parsing of the raw string value (e.g. comma-separated input).

---

## Aliases

The `alias` option maps short or alternate names to their canonical targets. Alias targets must be either a key of the schema's input type or a positional name extracted from the spec. This constraint is enforced at the type level.

```ts
alias: {
  e: 'env',      // positional alias
  f: 'force',    // flag alias
  r: 'region'    // optional positional alias
}
```

**Alias resolution happens before validation.** By the time the schema is called, all aliases have been resolved to their canonical names. The output object is always keyed by canonical names only — aliases are invisible in the output type.

---

## Argument Parsing Rules

### Positional filling

Positionals are filled left-to-right from non-flag tokens in argv. A positional may also be passed by name (e.g. `--env prod`), in which case the named form takes precedence over positional filling. If both a named and positional form are provided for the same argument, the named form wins.

### Variadic collection

A variadic positional (`[...name]`) collects all remaining non-flag tokens after prior positionals are filled. When passed by name, it uses space-separated values (`--targets a b c`), stopping at the next flag token.

### Flag parsing

Flags are parsed from tokens starting with `--` (long form) or `-` (short form, alias only). Boolean flags are `true` when present, `false` when absent. Value flags consume the next token or use `=` syntax (`--tag=v1.0`).

### Precedence summary

1. Named form (`--name value`) wins over positional form for the same argument.
2. Aliases resolve to canonical names before any other processing.
3. Subcommand bare words are matched and consumed before positional filling begins.

---

## Output Type

The resolved output type is the intersection of spec-inferred positionals and the schema output type:

```ts
type ParseResult<
  Spec extends string,
  Schema extends StandardSchemaV1,
> = InferSpecOutput<Spec, Schema> & Schema["~types"]["output"];
```

Where `InferSpecOutput` maps each spec positional to its resolved type (per the resolution table above), and `Schema['~types']['output']` contributes all flag types. Since the schema may also contain keys that match positional names (for type overrides), positional types in the intersection take their resolved form — the schema's contribution for that key is subsumed.

---

## Validation

Parsing and validation are two distinct phases:

1. **Parse** — tokenise argv, resolve aliases, fill positionals, collect flags. Produces a raw unvalidated record.
2. **Validate** — pass the raw record through the StandardSchema. Returns `Promise<output>` to accommodate async validators.

If validation fails, `parse()` rejects with the schema's validation error. The library does not catch or transform schema errors — they propagate as-is.

---

## Constraints and Invariants

- A positional name and a flag schema key must not collide. If `spec` contains `<env>` and `schema` also defines `env` as a flag (rather than a type override), this is ambiguous. The spec takes ownership of the name; the schema entry is treated as a type override, not a flag.
- Variadic positionals must be terminal in the spec. A non-terminal variadic is a runtime error thrown before parsing begins.
- Optional positionals must all be terminal and contiguous. A required positional may not follow an optional one.
- Only one variadic positional is permitted per spec.
- Alias targets that do not resolve to a known spec name or schema key produce a type error.

---

## Subpath: `cli-parser/schema`

A companion subpath exposes helpers for CLI-specific schema constructs:

- `path()` — a schema for filesystem paths, with coercion and existence validation hooks.

These helpers are thin wrappers over StandardSchema-compatible schemas and are designed to be passed directly as values in the `schema` option.
