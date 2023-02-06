import { parse } from "../src";
import { describe, expect, it, test } from "vitest";

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
    const result = parse(input, { alias: { h: 'help' }});
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
});
