---
"@bomb.sh/args": minor
---

Add `@bomb.sh/args/schema` subpath with built-in Standard Schema primitives requiring no external dependencies: `string`, `number`, `boolean`, `array`, `object`.

These work with `parse()` directly or compose with Zod, Valibot, Arktype, and any other `@standard-schema/spec`-compliant library.

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
