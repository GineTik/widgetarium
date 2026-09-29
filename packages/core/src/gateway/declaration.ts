import type { z } from "zod";
import type { SortRow } from "./contract";
import type { DeclaredFilterRow } from "./manifest";

export const DECLARATION = Symbol.for("widgetarium.declaration");

export type Kind = "collection" | "value" | "passed" | "slot" | "mounts";

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
	readonly passed?: string;
	readonly held?: Readonly<Record<string, unknown>>;
}

export function declarationIn(held: unknown): Declaration | null {
	if (typeof held !== "function") return null;
	return ((held as unknown as Record<symbol, Declaration | undefined>)[DECLARATION] ?? null) as Declaration | null;
}

export function defaultOf(declaration: Declaration): unknown {
	if (declaration.kind === "collection") return declaration.rows ?? [];
	const parsed = declaration.schema.safeParse(undefined);
	return parsed.success ? parsed.data : undefined;
}
