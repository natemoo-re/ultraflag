import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { parse, ParseError } from "../src";

describe("parse() with schema", () => {
  it("validates and returns typed output", async () => {
    const result = await parse(["--port", "3000", "--verbose"], {
      schema: z.object({
        port: z.coerce.number(),
        verbose: z.boolean().optional(),
        _: z.array(z.unknown()).optional(),
      }),
    });

    expect(result.port).toBe(3000);
    expect(result.verbose).toBe(true);
    expectTypeOf(result.port).toBeNumber();
    expectTypeOf(result.verbose).toEqualTypeOf<boolean | undefined>();
  });

  it("infers output type from schema", async () => {
    const result = await parse(["--name", "world"], {
      schema: z.object({
        name: z.string(),
        _: z.array(z.unknown()).optional(),
      }),
    });

    expectTypeOf(result).toEqualTypeOf<{ name: string; _?: unknown[] | undefined }>();
  });

  it("returns RawArgs when no schema provided", async () => {
    const result = await parse(["--foo", "bar"]);
    expect(result.foo).toBe("bar");
    expect(result._).toEqual([]);
    expectTypeOf(result._).toEqualTypeOf<(string | number | boolean)[]>();
  });

  it("throws ParseError on validation failure", async () => {
    await expect(
      parse(["--port", "notanumber"], {
        schema: z.object({ port: z.number() }),
      })
    ).rejects.toThrow(ParseError);
  });

  it("ParseError carries issues array", async () => {
    try {
      await parse(["--port", "bad"], {
        schema: z.object({ port: z.number() }),
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).issues).toBeDefined();
      expect((e as ParseError).issues.length).toBeGreaterThan(0);
    }
  });

  it("works with async schema validation", async () => {
    const asyncSchema = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: async (value: unknown) => {
          await new Promise((r) => setTimeout(r, 0));
          const v = value as { port: string };
          return { value: { port: Number(v.port) } };
        },
      },
    };

    const result = await parse(["--port", "8080"], { schema: asyncSchema });
    expect(result.port).toBe(8080);
  });

  it("handles default values via schema", async () => {
    const result = await parse([], {
      schema: z.object({
        port: z.coerce.number().default(3000),
        _: z.array(z.unknown()).default([]),
      }),
    });
    expect(result.port).toBe(3000);
  });

  it("supports aliases", async () => {
    const result = await parse(["-v"], {
      schema: z.object({
        verbose: z.boolean().optional(),
        _: z.array(z.unknown()).optional(),
      }),
      alias: { v: "verbose" },
    });
    expect(result.verbose).toBe(true);
  });
});

describe("positionals via _ in schema", () => {
  it("z.tuple for typed positionals", async () => {
    const result = await parse(["build", "--port", "3000"], {
      schema: z.object({
        _: z.tuple([z.string()]),
        port: z.coerce.number().optional(),
      }),
    });

    expect(result._[0]).toBe("build");
    expect(result.port).toBe(3000);
    expectTypeOf(result._).toEqualTypeOf<[string]>();
  });

  it("z.array for variadic positionals", async () => {
    const result = await parse(["a", "b", "c"], {
      schema: z.object({
        _: z.array(z.string()),
      }),
    });
    expect(result._).toEqual(["a", "b", "c"]);
  });

  it("-- terminator: passthrough args land in _", async () => {
    const result = await parse(["cmd", "--", "--not-a-flag"], {
      schema: z.object({
        _: z.array(z.string()),
      }),
    });
    expect(result._).toEqual(["cmd", "--not-a-flag"]);
  });
});

describe("env fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.APP_PORT = "9000";
    process.env.APP_VERBOSE = "true";
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("injects env vars for missing flags", async () => {
    const result = await parse([], {
      schema: z.object({
        port: z.coerce.number(),
        verbose: z.coerce.boolean(),
        _: z.array(z.unknown()).default([]),
      }),
      env: { prefix: "APP" },
    });
    expect(result.port).toBe(9000);
    expect(result.verbose).toBe(true);
  });

  it("argv takes precedence over env", async () => {
    const result = await parse(["--port", "4000"], {
      schema: z.object({
        port: z.coerce.number(),
        _: z.array(z.unknown()).default([]),
      }),
      env: { prefix: "APP" },
    });
    expect(result.port).toBe(4000);
  });

  it("env works with parseSync", () => {
    const result = parseSync([], { env: { prefix: "APP" } });
    expect(result.port).toBe(9000);
    expect(result.verbose).toBe(true); // coerce() converts "true" → boolean
  });
});

// Keep parseSync import for env test
import { parseSync } from "../src";
