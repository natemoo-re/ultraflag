import { describe, expect, expectTypeOf, it } from "vitest";
import { parse } from "../src";
import { array, boolean, number, object, string } from "../src/schema";

describe("string()", () => {
  it("passes strings through", async () => {
    const s = string();
    const r = s["~standard"].validate("hello");
    expect(r).toEqual({ value: "hello" });
  });

  it("coerces numbers to string", async () => {
    const r = string()["~standard"].validate(42);
    expect(r).toEqual({ value: "42" });
  });

  it("coerces booleans to string", async () => {
    const r = string()["~standard"].validate(true);
    expect(r).toEqual({ value: "true" });
  });

  it("fails for objects", async () => {
    const r = string()["~standard"].validate({});
    expect(r).toHaveProperty("issues");
  });
});

describe("number()", () => {
  it("passes numbers through", async () => {
    const r = number()["~standard"].validate(42);
    expect(r).toEqual({ value: 42 });
  });

  it("coerces numeric strings", async () => {
    const r = number()["~standard"].validate("3.14");
    expect(r).toEqual({ value: 3.14 });
  });

  it("fails for non-numeric strings", async () => {
    const r = number()["~standard"].validate("abc");
    expect(r).toHaveProperty("issues");
  });

  it("fails for booleans", async () => {
    const r = number()["~standard"].validate(true);
    expect(r).toHaveProperty("issues");
  });
});

describe("boolean()", () => {
  it("passes booleans through", async () => {
    expect(boolean()["~standard"].validate(true)).toEqual({ value: true });
    expect(boolean()["~standard"].validate(false)).toEqual({ value: false });
  });

  it("coerces 'true' string", async () => {
    expect(boolean()["~standard"].validate("true")).toEqual({ value: true });
  });

  it("coerces 'false' string", async () => {
    expect(boolean()["~standard"].validate("false")).toEqual({ value: false });
  });

  it("fails for arbitrary strings", async () => {
    const r = boolean()["~standard"].validate("yes");
    expect(r).toHaveProperty("issues");
  });
});

describe("array()", () => {
  it("passes arrays through", async () => {
    let r = array()["~standard"].validate([1, 2, 3]);
    if (r instanceof Promise) r = await r;
    expect(r).toEqual({ value: [1, 2, 3] });
  });

  it("fails for non-arrays", async () => {
    let r = array()["~standard"].validate("not an array");
    if (r instanceof Promise) r = await r;
    expect(r).toHaveProperty("issues");
  });

  it("validates items with item schema", async () => {
    let r = array(number())["~standard"].validate([1, 2, 3]);
    if (r instanceof Promise) r = await r;
    expect(r).toEqual({ value: [1, 2, 3] });
  });

  it("fails when item schema fails", async () => {
    let r = array(number())["~standard"].validate([1, "abc", 3]);
    if (r instanceof Promise) r = await r;
    expect(r).toHaveProperty("issues");
  });

  it("includes path in item errors", async () => {
    let r = array(number())["~standard"].validate(["bad"]);
    if (r instanceof Promise) r = await r;
    if ("issues" in r) {
      expect(r.issues[0].path).toContain(0);
    }
  });
});

describe("object()", () => {
  it("validates object shape", async () => {
    const schema = object({ name: string(), age: number() });
    let r = schema["~standard"].validate({ name: "Nate", age: 30 });
    if (r instanceof Promise) r = await r;
    expect(r).toEqual({ value: { name: "Nate", age: 30 } });
  });

  it("fails for non-objects", async () => {
    let r = object({ name: string() })["~standard"].validate("not an object");
    if (r instanceof Promise) r = await r;
    expect(r).toHaveProperty("issues");
  });

  it("includes key in nested errors", async () => {
    const schema = object({ port: number() });
    let r = schema["~standard"].validate({ port: "bad" });
    if (r instanceof Promise) r = await r;
    if ("issues" in r) {
      expect(r.issues[0].path).toContain("port");
    }
  });

  it("composes as parse() schema (no Zod needed)", async () => {
    const result = await parse(["--port", "8080", "--name", "cli"], {
      schema: object({
        port: number(),
        name: string(),
        _: array(),
      }),
    });
    expect(result.port).toBe(8080);
    expect(result.name).toBe("cli");
  });

  it("exposes shape for introspection", () => {
    const shape = { port: number(), name: string() };
    const schema = object(shape);
    expect(schema.shape).toBe(shape);
  });
});

describe(".docs()", () => {
  it("stores description in ~meta", () => {
    const s = string().docs("A string flag");
    expect(s["~meta"].docs).toBe("A string flag");
  });

  it("overwrites on second call", () => {
    const s = string().docs("first").docs("second");
    expect(s["~meta"].docs).toBe("second");
  });

  it("validation still works after chaining", () => {
    const r = string().docs("desc")["~standard"].validate("hello");
    expect(r).toEqual({ value: "hello" });
  });

  it("works on all primitives", () => {
    expect(number().docs("n")["~meta"].docs).toBe("n");
    expect(boolean().docs("b")["~meta"].docs).toBe("b");
    expect(array().docs("a")["~meta"].docs).toBe("a");
    expect(object({}).docs("o")["~meta"].docs).toBe("o");
  });
});

describe(".alias()", () => {
  it("stores alias in ~meta", () => {
    const s = string().alias("t");
    expect(s["~meta"].aliases).toEqual(["t"]);
  });

  it("accepts multiple names at once", () => {
    const s = string().alias("t", "timeout");
    expect(s["~meta"].aliases).toEqual(["t", "timeout"]);
  });

  it("accumulates across multiple calls", () => {
    const s = string().alias("t").alias("timeout");
    expect(s["~meta"].aliases).toEqual(["t", "timeout"]);
  });

  it("validation still works after chaining", () => {
    const r = string().alias("t")["~standard"].validate("hello");
    expect(r).toEqual({ value: "hello" });
  });

  it("works on all primitives", () => {
    expect(number().alias("n")["~meta"].aliases).toEqual(["n"]);
    expect(boolean().alias("b")["~meta"].aliases).toEqual(["b"]);
    expect(array().alias("a")["~meta"].aliases).toEqual(["a"]);
    expect(object({}).alias("o")["~meta"].aliases).toEqual(["o"]);
  });
});

describe("parse() alias auto-extraction", () => {
  it("resolves per-field .alias() short flags", async () => {
    const result = await parse(["-t", "5000"], {
      schema: object({
        timeout: number().alias("t"),
        _: array(),
      }),
    });
    expect(result.timeout).toBe(5000);
  });

  it("auto-resolves kebab-case flag to camelCase field", async () => {
    const result = await parse(["--module-types", "esm"], {
      schema: object({
        moduleTypes: string(),
        _: array(),
      }),
    });
    expect(result.moduleTypes).toBe("esm");
  });

  it("auto-resolves camelCase flag to camelCase field", async () => {
    const result = await parse(["--moduleTypes", "esm"], {
      schema: object({
        moduleTypes: string(),
        _: array(),
      }),
    });
    expect(result.moduleTypes).toBe("esm");
  });

  it("auto-resolves camelCase flag to kebab-case field", async () => {
    const result = await parse(["--moduleTypes", "esm"], {
      schema: object({
        "module-types": string(),
        _: array(),
      }),
    });
    expect(result["module-types"]).toBe("esm");
  });

  it("manual opts.alias overrides per-field alias on conflict", async () => {
    const result = await parse(["-t", "999"], {
      schema: object({
        threads: number(),
        _: array(),
      }),
      alias: { t: "threads" },
    });
    // manual alias wins: -t → threads
    expect(result.threads).toBe(999);
  });

  it("schemas without per-field aliases work unchanged", async () => {
    const result = await parse(["--port", "3000"], {
      schema: object({ port: number(), _: array() }),
    });
    expect(result.port).toBe(3000);
  });
});
