import type { z } from "zod";
import type { SortRow } from "./contract";
import type { DeclaredFilterRow, HeldSpec } from "./manifest";

export const DECLARATION = Symbol.for("widgetarium.declaration");

export const BARE_QUERY = Symbol.for("widgetarium.bare-query");

export const QUERY_WITHOUT_SCHEMA = 'prop "{name}" is a query with no shape: write IQuery.output(schema)';

export type Kind = "collection" | "value" | "command" | "passed" | "slot" | "mounts";

export interface Declaration {
	readonly kind: Kind;
	readonly schema: z.ZodType;
	readonly create?: z.ZodType;
	readonly update?: z.ZodType;
	readonly reads?: readonly string[];
	readonly writes: readonly string[];
	readonly pickableWrites?: readonly string[];
	readonly where?: readonly DeclaredFilterRow[];
	readonly sort?: readonly SortRow[];
	readonly rows?: readonly unknown[];
	readonly isQuery?: boolean;
	// TODO: read by handle(input) in C2
	readonly input?: z.ZodType;
	readonly output?: z.ZodType;
	readonly isBound?: boolean;
	readonly passed?: string;
	readonly held?: Readonly<HeldSpec>;
}

export function declarationIn(held: unknown): Declaration | null {
	if (typeof held !== "function" || !(DECLARATION in held)) return null;
	const declared = held[DECLARATION];
	return isDeclaration(declared) ? declared : null;
}

export function isPortItself(held: unknown): boolean {
	return typeof held === "function" && Object.prototype.hasOwnProperty.call(held, DECLARATION);
}

export function classNameOf(held: unknown): string {
	return typeof held === "function" && held.name !== "" ? held.name : "this class";
}

export function defaultOf(declaration: Declaration): unknown {
	const declared = declaredDefaultOf(declaration);
	return declared === undefined ? emptyValueOf(declaration.schema) : declared;
}

export function declaredDefaultOf(declaration: Declaration): unknown {
	if (declaration.kind === "collection") return declaration.rows ?? [];
	const parsed = declaration.schema.safeParse(undefined);
	return parsed.success ? parsed.data : undefined;
}

const EMPTY_OF_TYPE: Readonly<Record<string, unknown>> = { array: [], string: "", number: 0, boolean: false };

export function emptyValueOf(schema: unknown): unknown {
	const def: unknown = Reflect.get(Reflect.get(Object(schema), "_zod") ?? {}, "def");
	const type: unknown = Reflect.get(Object(def), "type");
	if (typeof type === "string" && type in EMPTY_OF_TYPE) return EMPTY_OF_TYPE[type];
	if (type === "enum") return Object.values(Object(Reflect.get(Object(def), "entries")))[0] ?? null;
	return null;
}

function isDeclaration(held: unknown): held is Declaration {
	return typeof held === "object" && held !== null && "kind" in held && typeof held.kind === "string";
}
