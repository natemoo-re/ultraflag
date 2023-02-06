import type {
  ParseOptions,
  Args,
  NestedMapping,
  Values,
  BooleanType,
  StringType,
  Collectable,
  Aliases,
} from "./types.js";
export { ParseOptions, Args } from "./types.js";

const BOOL_RE = /^(true|false)$/;
const QUOTED_RE = /^('|").*\1$/;

const set = (obj: NestedMapping, key: string, value: any, type?: string) => {
  if (key.includes(".")) {
    const parts = key.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      let tmp = {};
      set(obj, k, tmp);
      obj = tmp;
    }
    key = parts[parts.length - 1];
  }
  if (type === "array" && obj[key] !== undefined) {
    if (Array.isArray(obj[key])) {
      (obj[key] as any[]).push(value);
    } else {
      obj[key] = [obj[key], value];
    }
  } else {
    obj[key] = type === "array" ? [value] : value;
  }
};

const type = (
  key: string,
  opts: Record<"boolean" | "string" | "array", string[]>
): "boolean" | "string" | "array" | undefined => {
  if (opts.array && opts.array.length > 0 && opts.array.includes(key))
    return "array";
  if (opts.string && opts.string.length > 0 && opts.string.includes(key))
    return "string";
  if (opts.boolean && opts.boolean.length > 0 && opts.boolean.includes(key))
    return "boolean";
  return;
};

const defaultValue = (type?: "boolean" | "string" | "array") => {
  if (type === "string") return "";
  if (type === "array") return [];
  return true;
};

const coerce = (value?: string, type?: "string" | "boolean" | "array") => {
  if (type === "string") return value;
  if (type === "boolean") return !!value;

  if (!value) return value;
  if (value.length > 3 && BOOL_RE.test(value)) return value === "true";
  if (value.length > 2 && QUOTED_RE.test(value)) return value.slice(1, -1);
  if (value[0] === '.' && /\d/.test(value[1]) || /\d/.test(value[0])) return Number(value);
  return value;
};

export function parse<
  TArgs extends Values<
    TBooleans,
    TStrings,
    TCollectable,
    undefined,
    TDefaults,
    TAliases
  >,
  TBooleans extends BooleanType = undefined,
  TStrings extends StringType = undefined,
  TCollectable extends Collectable = undefined,
  TDefaults extends Record<string, unknown> | undefined = undefined,
  TAliases extends Aliases<TAliasArgNames, TAliasNames> | undefined = undefined,
  TAliasArgNames extends string = string,
  TAliasNames extends string = string
>(
  argv: string[],
  {
    default: defaults,
    alias: aliases,
    ...types
  }: ParseOptions<TBooleans, TStrings, TCollectable, TDefaults, TAliases> = {}
): Args<TArgs> {
  if (argv.length === 0) return {} as Args<TArgs>;
  const obj = { ...defaults, _: [] } as unknown as Args<TArgs>;

  const args = [];
  for (let i = 0; i < argv.length; i++) {
    const curr = argv[i];
    const next = argv[i + 1];

    let t: 'string' | 'boolean' | 'array' | undefined;
    let key = '';
    let value: string | undefined;

    if (curr.length > 1 && curr[0] === "-") {
      if (curr[1] !== "-" && curr.length > 2 && !curr.includes('=')) {
        if (curr.includes('.')) {
          key = curr.slice(1, 2);
          value = curr.slice(2);
        } else {
          const keys = curr.slice(1, -1);
          for (let key of keys) {
            if (aliases && (aliases as Record<string, any>)[key] !== undefined) {
              key = aliases[key as keyof typeof aliases] as string;
            }
            set(obj, key, defaultValue(t), t)
          }
          key = curr.slice(-1)
          if (next && next[0] !== '-') {
            value = next;
            i++;
          }
        }
      } else if (!curr.includes("=") && next && next[0] !== "-") {
        key = curr.replace(/^-{1,2}/, '');
        value = next;
        t = type(key, types as any);
        i++;
      } else {
        const eq = curr.indexOf('=');
        if (eq === -1) {
          key = curr.replace(/^-{1,2}/, '');
        } else {
          key = curr.slice(0, eq).replace(/^-{1,2}/, '');
          value = curr.slice(eq + 1);
        }
        t = type(key, types as any);
      }
      
      if ((!t || t === "boolean") && key.length > 3 && key.startsWith('no-')) {
        set(obj, key.slice(3), false)
      } else {
        if (aliases && (aliases as Record<string, any>)[key] !== undefined) {
          key = aliases[key as keyof typeof aliases] as string;
        }
        set(obj, key, coerce(value, t) ?? defaultValue(t), t)
      }
    } else if (curr) {
      (obj as any)._.push(coerce(curr));
      continue;
    }
  }

  return obj;
}
