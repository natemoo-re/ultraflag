import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ArgsSchema, SchemaMeta } from "./types.js";

type Issue = StandardSchemaV1.Issue;
type Result<T> = StandardSchemaV1.Result<T>;

function ok<T>(value: T): Result<T> {
	return { value };
}

function fail(message: string, path?: PropertyKey[]): Result<never> {
	const issue: Issue = path ? { message, path } : { message };
	return { issues: [issue] };
}

function makeSchema<I, O>(
	validate: (value: I) => Result<O> | Promise<Result<O>>,
): ArgsSchema<I, O> {
	const schema = {
		"~standard": {
			version: 1,
			vendor: "@bomb.sh/args",
			validate: validate as (value: unknown) => Result<O> | Promise<Result<O>>,
		},
		"~meta": {} as SchemaMeta,
		docs(description: string) {
			this["~meta"].docs = description;
			return this;
		},
		alias(...names: string[]) {
			this["~meta"].aliases = [...(this["~meta"].aliases ?? []), ...names];
			return this;
		},
	} as ArgsSchema<I, O>;
	return schema;
}

export function string(): ArgsSchema<unknown, string> {
	return makeSchema((value) => {
		if (typeof value === "string") return ok(value);
		if (typeof value === "number" || typeof value === "boolean")
			return ok(String(value));
		return fail(`Expected string, received ${typeof value}`);
	});
}

export function number(): ArgsSchema<unknown, number> {
	return makeSchema((value) => {
		if (typeof value === "number") return ok(value);
		if (typeof value === "string") {
			const n = Number(value);
			if (!Number.isNaN(n)) return ok(n);
		}
		return fail(`Expected number, received ${typeof value}`);
	});
}

export function boolean(): ArgsSchema<unknown, boolean> {
	return makeSchema((value) => {
		if (typeof value === "boolean") return ok(value);
		if (value === "true" || value === "1" || value === 1) return ok(true);
		if (value === "false" || value === "0" || value === 0) return ok(false);
		return fail(`Expected boolean, received ${typeof value}`);
	});
}

export function array<T = unknown>(
	item?: StandardSchemaV1<unknown, T>,
): ArgsSchema<unknown, T[]> {
	return makeSchema(async (value) => {
		if (!Array.isArray(value))
			return fail(`Expected array, received ${typeof value}`);
		if (!item) return ok(value as T[]);

		const out: T[] = [];
		const issues: Issue[] = [];
		for (let i = 0; i < value.length; i++) {
			let r = item["~standard"].validate(value[i]);
			if (r instanceof Promise) r = await r;
			if (r.issues) {
				for (const issue of r.issues) {
					issues.push({
						message: issue.message,
						path: [i, ...(issue.path ?? [])],
					});
				}
			} else {
				out.push(r.value);
			}
		}
		return issues.length > 0 ? { issues } : ok(out);
	});
}

type ShapeOutput<T extends Record<string, StandardSchemaV1>> = {
	[K in keyof T]: StandardSchemaV1.InferOutput<T[K]>;
};

export interface ObjectSchema<T extends Record<string, StandardSchemaV1>>
	extends ArgsSchema<unknown, ShapeOutput<T>> {
	readonly shape: T;
}

export function object<T extends Record<string, StandardSchemaV1>>(
	shape: T,
): ObjectSchema<T> {
	const validate = async (value: unknown): Promise<Result<ShapeOutput<T>>> => {
		if (typeof value !== "object" || value === null || Array.isArray(value))
			return fail(`Expected object, received ${typeof value}`);

		const input = value as Record<string, unknown>;
		const out: Record<string, unknown> = {};
		const issues: Issue[] = [];

		for (const [key, schema] of Object.entries(shape)) {
			let r = schema["~standard"].validate(input[key]);
			if (r instanceof Promise) r = await r;
			if (r.issues) {
				for (const issue of r.issues) {
					issues.push({
						message: issue.message,
						path: [key, ...(issue.path ?? [])],
					});
				}
			} else {
				out[key] = r.value;
			}
		}
		return issues.length > 0 ? { issues } : ok(out as ShapeOutput<T>);
	};

	return {
		"~standard": {
			version: 1,
			vendor: "@bomb.sh/args",
			validate,
		},
		"~meta": {} as SchemaMeta,
		shape,
		docs(description: string) {
			this["~meta"].docs = description;
			return this;
		},
		alias(...names: string[]) {
			this["~meta"].aliases = [...(this["~meta"].aliases ?? []), ...names];
			return this;
		},
	} as ObjectSchema<T>;
}
