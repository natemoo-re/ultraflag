import type { StandardSchemaV1 } from "@standard-schema/spec";
export type { StandardSchemaV1 };

export interface SchemaMeta {
	docs?: string;
	aliases?: string[];
}

export interface ArgsSchema<I = unknown, O = I> extends StandardSchemaV1<I, O> {
	readonly "~meta": SchemaMeta;
	docs(description: string): this;
	alias(...names: string[]): this;
}

export type RawValue = string | number | boolean;

export interface RawArgs {
	_: RawValue[];
	[key: string]: RawValue | RawValue[] | RawArgs;
}

export interface EnvOptions {
	prefix: string;
}

export interface ParseOptions<
	TSchema extends StandardSchemaV1 | undefined = undefined,
	TAliases extends Record<string, string> | undefined = undefined,
> {
	/** Standard Schema-compliant schema. Output type drives `parse()` return type. */
	schema?: TSchema;
	/** Map short flags to long names. */
	alias?: TAliases;
	/**
	 * When set, auto-defaults flags from environment variables before schema
	 * validation. Flag `--foo-bar` maps to `PREFIX_FOO_BAR` (uppercased,
	 * hyphens replaced with underscores).
	 */
	env?: false | EnvOptions;
}

export type ParseResult<TSchema extends StandardSchemaV1 | undefined> =
	TSchema extends StandardSchemaV1
		? StandardSchemaV1.InferOutput<TSchema>
		: RawArgs;

export interface NestedMapping {
	[key: string]: NestedMapping | unknown;
}

export class ParseError extends Error {
	readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;
	constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
		super(issues.map((i) => i.message).join("\n"));
		this.name = "ParseError";
		this.issues = issues;
	}
}
