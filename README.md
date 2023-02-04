# `ultraflag`

A <1kB library for parsing CLI flags. Inspired by Deno's `std` [`flags`](https://github.com/denoland/deno_std/blob/main/flags/mod.ts) module.

### Features

- It's very small.
- It's very fast.

### Usage

Basic usage does not require any configuration.

```js
import { parse } from "ultraflag";

// my-cli build --bundle -rf --a value --b=value --c 1
const argv = process.argv.slice(2);
const args = parse(argv);

console.log(args);
// { _: ['build'], bundle: true, r: true, f: true, a: "value", b: "value", c: 1 }
```

Parsing can be configured to ensure values are handled in a certain format.

```js
const args = parse(argv, {
  default: { a: 1, b: 2, c: "value" },
  alias: { h: "help" },
  boolean: ["foo", "bar"],
  string: ["baz", "qux"],
  array: ["input"],
});
```

## Benchmarks

```
ultraflag x 801,993 ops/sec ±0.40% (95 runs sampled)
minimist x 318,623 ops/sec ±0.49% (95 runs sampled)
yargs-parser x 23,560 ops/sec ±3.77% (91 runs sampled)
```
