---
"@bomb.sh/args": major
---

`parse()` is now async and returns `Promise<T>`. Update call sites with `await`.

`ParseOptions` no longer accepts `boolean`, `string`, `array`, or `default` options. Use your schema library's built-in type coercion and `.default()` instead.

**Before:**

```ts
const args = parse(argv, {
  boolean: ["verbose"],
  string: ["output"],
  default: { port: 3000 },
  alias: { v: "verbose" },
});
```

**After (with Zod):**

```ts
const args = await parse(argv, {
  schema: z.object({
    verbose: z.boolean().default(false),
    output: z.string(),
    port: z.coerce.number().default(3000),
  }),
  alias: { v: "verbose" },
});
```

**After (built-in primitives, no Zod):**

```ts
import { object, boolean, string, number } from "@bomb.sh/args/schema";

const args = await parse(argv, {
  schema: object({ verbose: boolean(), output: string(), port: number() }),
  alias: { v: "verbose" },
});
```

**After (sync, no schema):**

```ts
const args = parseSync(argv, { alias: { v: "verbose" } });
```
