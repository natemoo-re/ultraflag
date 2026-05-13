import type {
	ArgsSchema,
	EnvOptions,
	NestedMapping,
	ParseOptions,
	ParseResult,
	RawArgs,
	RawValue,
	SchemaMeta,
	StandardSchemaV1,
} from "./types.js";
export { ParseError, ParseOptions, RawArgs, StandardSchemaV1, ArgsSchema, SchemaMeta } from "./types.js";
import { ParseError } from "./types.js";
import type { ObjectSchema } from "./schema.js";

const BOOL_RE = /^(true|false)$/;
const QUOTED_RE = /^('|").*\1$/;

const set = (obj: NestedMapping, key: string, value: unknown, collect?: boolean) => {
	if (key.includes(".")) {
		const parts = key.split(".");
		for (let i = 0; i < parts.length - 1; i++) {
			const k = parts[i];
			const tmp: NestedMapping = {};
			set(obj, k, tmp);
			obj = tmp;
		}
		key = parts[parts.length - 1];
	}
	if (collect && obj[key] !== undefined) {
		if (Array.isArray(obj[key])) {
			(obj[key] as unknown[]).push(value);
		} else {
			obj[key] = [obj[key], value];
		}
	} else {
		obj[key] = collect ? [value] : value;
	}
};

const coerce = (value?: string): RawValue | undefined => {
	if (value === undefined) return undefined;
	if (value.length > 3 && BOOL_RE.test(value)) return value === "true";
	if (value.length > 2 && QUOTED_RE.test(value)) return value.slice(1, -1);
	if ((value[0] === "." && /\d/.test(value[1])) || /\d/.test(value[0]))
		return Number(value);
	return value;
};

function applyEnv(raw: RawArgs, { prefix }: EnvOptions): void {
	const p = prefix.toUpperCase() + "_";
	for (const [envKey, envVal] of Object.entries(process.env)) {
		if (!envKey.startsWith(p) || envVal === undefined) continue;
		const flag = envKey.slice(p.length).toLowerCase().replace(/_/g, "-");
		if (!(flag in raw)) {
			const coerced = coerce(envVal);
			if (coerced !== undefined) raw[flag] = coerced;
		}
	}
}

/** Convert camelCase to kebab-case: "moduleTypes" → "module-types" */
function toKebab(str: string): string {
	return str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** Convert kebab-case to camelCase: "module-types" → "moduleTypes" */
function toCamel(str: string): string {
	return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Extract aliases from a schema's shape (if it's an ObjectSchema).
 * For each field:
 * - Per-field `.alias()` names → { aliasName: fieldName }
 * - camelCase field names → auto-add kebab-case alias: { "module-types": "moduleTypes" }
 * - kebab-case field names → auto-add camelCase alias: { "moduleTypes": "module-types" }
 */
function extractAliases(schema: StandardSchemaV1): Record<string, string> {
	const result: Record<string, string> = {};
	if (!("shape" in schema) || typeof (schema as any).shape !== "object" || (schema as any).shape === null) {
		return result;
	}
	const shape = (schema as ObjectSchema<Record<string, StandardSchemaV1>>).shape;
	for (const [fieldName, fieldSchema] of Object.entries(shape)) {
		// Per-field aliases from .alias()
		if ("~meta" in fieldSchema) {
			const meta = (fieldSchema as ArgsSchema)["~meta"] as SchemaMeta;
			if (meta.aliases) {
				for (const a of meta.aliases) {
					result[a] = fieldName;
				}
			}
		}
		// Auto camelCase↔kebab-case
		if (/[A-Z]/.test(fieldName)) {
			// camelCase field → add kebab alias
			const kebab = toKebab(fieldName);
			if (!(kebab in result)) result[kebab] = fieldName;
		} else if (fieldName.includes("-")) {
			// kebab-case field → add camelCase alias
			const camel = toCamel(fieldName);
			if (!(camel in result)) result[camel] = fieldName;
		}
	}
	return result;
}

function parseRaw(
	argv: string[],
	aliases?: Record<string, string>,
): RawArgs {
	const obj: RawArgs = { _: [] };
	if (argv.length === 0) return obj;

	for (let i = 0; i < argv.length; i++) {
		const curr = argv[i];
		const next = argv[i + 1];

		// -- terminator: everything after is a raw positional
		if (curr === "--") {
			for (let j = i + 1; j < argv.length; j++) {
				const v = coerce(argv[j]);
				obj._.push(v !== undefined ? v : argv[j] as RawValue);
			}
			break;
		}

		let key = "";
		let value: string | undefined;

		if (curr.length > 1 && curr[0] === "-") {
			if (curr[1] !== "-" && curr.length > 2 && !curr.includes("=")) {
				// Short combined flags: -abc or -a.b (dotted short)
				if (curr.includes(".")) {
					key = curr.slice(1, 2);
					value = curr.slice(2);
				} else {
					// Expand all but last as boolean flags
					const keys = curr.slice(1, -1);
					for (let k of keys) {
						if (aliases?.[k] !== undefined) k = aliases[k];
						set(obj, k, true);
					}
					key = curr.slice(-1);
					if (next && next[0] !== "-") {
						value = next;
						i++;
					}
				}
			} else if (!curr.includes("=") && next && next[0] !== "-") {
				// --flag value
				key = curr.replace(/^-{1,2}/, "");
				value = next;
				i++;
			} else {
				// --flag or --flag=value
				const eq = curr.indexOf("=");
				if (eq === -1) {
					key = curr.replace(/^-{1,2}/, "");
				} else {
					key = curr.slice(0, eq).replace(/^-{1,2}/, "");
					value = curr.slice(eq + 1);
				}
			}

			if (key.length > 3 && key.startsWith("no-")) {
				set(obj, key.slice(3), false);
			} else {
				if (aliases?.[key] !== undefined) key = aliases[key];
				set(obj, key, coerce(value) ?? true);
			}
		} else if (curr) {
			const v = coerce(curr);
			obj._.push(v !== undefined ? v : curr as RawValue);
		}
	}

	return obj;
}

export async function parse<
	TSchema extends StandardSchemaV1 | undefined = undefined,
	TAliases extends Record<string, string> | undefined = undefined,
>(
	argv: string[],
	opts?: ParseOptions<TSchema, TAliases>,
): Promise<ParseResult<TSchema>> {
	const schemaAliases = opts?.schema ? extractAliases(opts.schema) : {};
	const mergedAliases = { ...schemaAliases, ...opts?.alias };
	const hasAliases = Object.keys(mergedAliases).length > 0;

	const raw = parseRaw(argv, hasAliases ? mergedAliases : undefined);
	if (opts?.env) applyEnv(raw, opts.env);

	if (!opts?.schema) return raw as ParseResult<TSchema>;

	let result = opts.schema["~standard"].validate(raw);
	if (result instanceof Promise) result = await result;
	if (result.issues) {
		throw new ParseError(result.issues);
	}
	return result.value as ParseResult<TSchema>;
}

export function parseSync(
	argv: string[],
	opts?: Omit<ParseOptions<undefined, Record<string, string>>, "schema">,
): RawArgs {
	const raw = parseRaw(argv, opts?.alias);
	if (opts?.env) applyEnv(raw, opts.env);
	return raw;
}
