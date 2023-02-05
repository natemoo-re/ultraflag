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

const FLAG_RE = /(?:--?([^\s=]+))(?:\s+|=|$)("[^"]+"|'[^']+'|[^-\s]+)?|\S+/gm;
const BOOL_RE = /^(true|false)$/;
const NUMBER_RE = /^(\.?\d)/;
const QUOTED_RE = /^('|").*\1$/;
const NEGATED_RE = /^no-/;
const SINGLE_RE = /^-[^-]/;

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
  if (type === 'array' && obj[key] !== undefined) {
    if (Array.isArray(obj[key])) {
      (obj[key] as any[]).push(value);
    } else {
      obj[key] = [obj[key], value];
    }
  } else {
    obj[key] = type === 'array' ? [value] : value;
  }
};

const type = (key: string, opts: Record<'boolean' | 'string' | 'array', string[]>): 'boolean' | 'string' | 'array' | undefined => {
  for (const [t, keys] of Object.entries(opts)) {
    if (keys.includes(key)) return t as keyof typeof opts;
  }
  return;
}

const defaultValue = (type?: 'boolean' | 'string' | 'array') => {
  if (type === 'string') return '';
  if (type === 'array') return [];
  return true;
}

const coerce = (value: string, type?: 'string' | 'boolean' | "array") => {
  if (type === 'string') return value;
  if (type === 'boolean') return !!value;

  if (!value) return value;
  if (BOOL_RE.test(value)) return value === "true";
  if (NUMBER_RE.test(value)) return Number(value);
  if (QUOTED_RE.test(value)) return value.slice(1, -1);
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
  { default: defaults, alias: aliases = {}, ...types }: ParseOptions<
    TBooleans,
    TStrings,
    TCollectable,
    TDefaults,
    TAliases
  > = {}
): Args<TArgs> {
  if (argv.length === 0) return {} as Args<TArgs>;
  const str = argv.join(' ');

  FLAG_RE.lastIndex = 0;
  let m;
  const obj = { ...defaults, _: [] } as unknown as Args<TArgs>;
  while ((m = FLAG_RE.exec(str))) {
    let [value, key, arg] = m;
    let isAliased = false;
    if (!key && !arg) {
      (obj as any)._.push(coerce(value));
      continue;
    }
    if (aliases.hasOwnProperty(key)) {
      key = aliases[key as keyof typeof aliases] as string;
      isAliased = true;
    }
    const t = type(key, types as any);

    if (!isAliased && SINGLE_RE.test(value)) {
      // Special case! `-a.a1` should be treated as { a: '.a1' }
      if (key.includes(".")) {
        set(obj, key.split(".")[0], "." + key.split(".").slice(1).join("."));
        FLAG_RE.lastIndex -= arg?.length ?? 0;
      } else {
        for (const k of key.slice(0, -1)) {
          set(obj, k, true);
        }
        set(obj, key[key.length - 1], coerce(arg, t) ?? true);
      }
    } else if ((!t || t === 'boolean') && NEGATED_RE.test(key)) {
      set(obj, key.slice(3), false);
    } else {
      set(obj, key, coerce(arg, t) ?? defaultValue(t), t);
    }
  }

  return obj;
}
