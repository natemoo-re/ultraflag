import { describe, expect, it, test } from "vitest";
import { parse } from "../src";

describe("flags", () => {
  it("a b c", () => {
    const input = ["a", "b", "c"];
    const output = { _: ["a", "b", "c"] };
    expect(parse(input)).toEqual(output);
  });

  it("-a -b -c", () => {
    const input = ["-a", "-b", "-c"];
    const output = { _: [], a: true, b: true, c: true };
    expect(parse(input)).toEqual(output);
  });

  it("-a 1 -b 2 -c 3 -d -e", () => {
    const input = ["-a", "1", "-b", "2", "-c", "3", "-d", "-e"];
    const output = { _: [], a: 1, b: 2, c: 3, d: true, e: true };
    expect(parse(input)).toEqual(output);
  });

  it("-a=1 -b 2 -c=3 -d -e", () => {
    const input = ["-a", "1", "-b", "2", "-c", "3", "-d", "-e"];
    const output = { _: [], a: 1, b: 2, c: 3, d: true, e: true };
    expect(parse(input)).toEqual(output);
  });

  it(`-a aaa bbb -b ccc ddd -c 3 -d -e`, () => {
    const input = [
      "-a",
      "aaa",
      "bbb",
      "-b",
      "ccc",
      "ddd",
      "-c",
      "3",
      "-d",
      "-e",
    ];
    const output = {
      _: ["bbb", "ddd"],
      a: "aaa",
      b: "ccc",
      c: 3,
      d: true,
      e: true,
    };
    expect(parse(input)).toEqual(output);
  });

  it(`-a "aaa bbb" -b "ccc ddd" -c 3 -d -e`, () => {
    const input = [`-a`, `"aaa bbb"`, `-b`, `"ccc ddd"`, `-c`, `3`, `-d`, `-e`];
    const output = {
      _: [],
      a: "aaa bbb",
      b: "ccc ddd",
      c: 3,
      d: true,
      e: true,
    };
    expect(parse(input)).toEqual(output);
  });

  it("comprehensive", () => {
    const input = [
      "--name=meowmers",
      "bare",
      "-cats",
      "woo",
      "-h",
      "awesome",
      "--multi=quux",
      "--key",
      "value",
      "-b",
      "--bool",
      "--no-meep",
      "--multi=baz",
      "-f=abc=def",
    ];
    const output = {
      c: true,
      a: true,
      t: true,
      f: "abc=def",
      s: "woo",
      h: "awesome",
      b: true,
      bool: true,
      key: "value",
      multi: "baz",
      meep: false,
      name: "meowmers",
      _: ["bare"],
    };
    expect(parse(input)).toEqual(output);
  });
});

describe("dotted", () => {
  it("-a.a1 1 -b.b1 2 -c.c1 3 -d -e", () => {
    const input = ["-a.a1", "1", "-b.b1", "2", "-c.c1", "3", "-d", "-e"];
    const output = {
      _: [1, 2, 3],
      a: ".a1",
      b: ".b1",
      c: ".c1",
      d: true,
      e: true,
    };
    expect(parse(input)).toEqual(output);
  });

  it("--a.a1 1 --b.b1 2 --c.c1 3 -d -e", () => {
    const input = ["--a.a1", "1", "--b.b1", "2", "--c.c1", "3", "-d", "-e"];
    const output = {
      _: [],
      a: { a1: 1 },
      b: { b1: 2 },
      c: { c1: 3 },
      d: true,
      e: true,
    };
    expect(parse(input)).toEqual(output);
  });

  it("--a.a1.a2 1 --b.b1.b2 2 --c.c1.c2 3 -d -e", () => {
    const input = [
      "--a.a1.a2",
      "1",
      "--b.b1.b2",
      "2",
      "--c.c1.c2",
      "3",
      "-d",
      "-e",
    ];
    const output = {
      _: [],
      a: { a1: { a2: 1 } },
      b: { b1: { b2: 2 } },
      c: { c1: { c2: 3 } },
      d: true,
      e: true,
    };
    expect(parse(input)).toEqual(output);
  });
});

describe("negated", () => {
  it("supports unknown", () => {
    const input = ["--no-bundle", "--watch"];
    const output = {
      _: [],
      bundle: false,
      watch: true,
    };
    expect(parse(input)).toEqual(output);
  });

  it("ignores strings", () => {
    const input = ["--no-bundle", "--watch"];
    const opts = {
      string: ['no-bundle']
    }
    const output = {
      _: [],
      'no-bundle': '',
      watch: true,
    };
    expect(parse(input, opts)).toEqual(output);
  });

  it("ignores arrays", () => {
    const input = ["--no-bundle", '1', "--watch"];
    const opts = {
      array: ['no-bundle']
    }
    const output = {
      _: [],
      'no-bundle': [1],
      watch: true,
    };
    expect(parse(input, opts)).toEqual(output);
  });
});

describe("aliases", () => {
  it("works", () => {
    const input = ["-h"];
    const output = {
      _: [],
      help: true
    };
    const result = parse(input, { alias: { h: 'help' } });
    expect(result).toEqual(output);
  });

  it("ignores strings", () => {
    const input = ["--no-bundle", "--watch"];
    const opts = {
      string: ['no-bundle']
    }
    const output = {
      _: [],
      'no-bundle': '',
      watch: true,
    };
    expect(parse(input, opts)).toEqual(output);
  });

  it("ignores arrays", () => {
    const input = ["--no-bundle", '1', "--watch"];
    const opts = {
      array: ['no-bundle']
    }
    const output = {
      _: [],
      'no-bundle': [1],
      watch: true,
    };
    expect(parse(input, opts)).toEqual(output);
  });
});

describe("special cases", () => {
  it("just a hyphen", () => {
    const input = ["-"];
    const output = {
      _: ['-'],
    };
    const result = parse(input);
    expect(result).toEqual(output);
  });

  it("just a hyphen", () => {
    const input = ["-"];
    const output = {
      _: ['-'],
    };
    const result = parse(input);
    expect(result).toEqual(output);
  });

  it("string after boolean should be treated as positional", () => {
    const input = ["--get", "http://my-url.com"];
    const opts = {
      boolean: ['get']
    }
    const output = {
      "_": ["http://my-url.com"],
      "get": true,
    };
    const result = parse(input, opts);
    expect(result).toEqual(output);
  });
});

describe("coerce NaN guard", () => {
  it("version-like string as positional is kept as string", () => {
    expect(parse(["3.7.1"])).toEqual({ _: ["3.7.1"] });
  });

  it("digit-prefixed non-numeric string as positional is kept as string", () => {
    expect(parse(["1abc"])).toEqual({ _: ["1abc"] });
  });

  it("version-like string as flag value is kept as string", () => {
    expect(parse(["--version", "3.7.1"])).toEqual({ _: [], version: "3.7.1" });
  });

  it("valid numbers still coerce correctly", () => {
    expect(parse(["42"])).toEqual({ _: [42] });
    expect(parse([".5"])).toEqual({ _: [0.5] });
    expect(parse(["3.14"])).toEqual({ _: [3.14] });
  });
});

describe("boolean flags", () => {
  it("should handle long-form boolean flags correctly", () => {
    const input = ["--add"];
    const opts = {
      boolean: ['add']
    };
    const output = { _: [], add: true };
    expect(parse(input, opts)).toEqual(output);
  });

  it("should handle alias boolean flags correctly", () => {
    const input = ["-a"];
    const opts = {
      boolean: ['add'],
      alias: { a: 'add' }
    };
    const output = { _: [], add: true };
    expect(parse(input, opts)).toEqual(output);
  });
});
