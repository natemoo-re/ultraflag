---
"@bomb.sh/args": minor
---

`parse()` now automatically resolves camelCase ↔ kebab-case flag variants when using an `object()` schema. No aliases required — `--moduleTypes` and `--module-types` both map to a `moduleTypes` field.

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

This eliminates the need for manual workarounds like `--moduleTypes` → `--module-types` normalization.
