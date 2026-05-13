---
"@bomb.sh/args": minor
---

Add `.alias()` and `.docs()` chainable methods to all built-in schema primitives.

`.alias(...names)` registers per-field aliases that are automatically extracted by `parse()` when using an `object()` schema — no manual `alias` map required.

`.docs(description)` attaches a description string to the schema for help text generation and tooling.

```ts
import { object, number, boolean } from "@bomb.sh/args/schema";

const args = await parse(process.argv.slice(2), {
  schema: object({
    port: number().alias("p").docs("Port to listen on"),
    verbose: boolean().alias("v").docs("Enable verbose output"),
  }),
});
// parse(["-p", "3000"]) → { port: 3000 }
// parse(["-v"])         → { verbose: true }
```

Manual `opts.alias` entries take precedence over per-field aliases on conflict.

Also exports `ArgsSchema`, `SchemaMeta`, and `ObjectSchema` types for consumers building on top of the built-in primitives. `object()` now exposes a `shape` property for introspection.
