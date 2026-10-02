import type { z } from "zod";
import type { SortRow } from "./contract";
import type { DeclaredFilterRow, HeldSpec } from "./manifest";

export const DECLARATION = Symbol.for("widgetarium.declaration");

export const BARE_QUERY = Symbol.for("widgetarium.bare-query");

export const QUERY_WITHOUT_SCHEMA = 'prop "{name}" is a query with no shape: write IQuery.expects(schema)';

export const IMPLEMENTATION_WORD_IN_WIDGET =
	'prop "{name}" is declared with {word}, the word an implementation extends: a widget writes {fits}';

export type DeclaringWord = "expects" | "returns" | "returnsAny" | "sends" | "takes";

export const WIDGET_WORDS: readonly DeclaringWord[] = ["expects", "sends"];

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
	readonly word?: DeclaringWord;
	readonly isBound?: boolean;
	readonly passed?: string;
	readonly held?: Readonly<HeldSpec>;
}

export function declarationIn(held: unknown): Declaration | null {
	if (typeof held !== "function" || !(DECLARATION in held)) return null;
	const declared = held[DECLARATION];
	return isDeclaration(declared) ? declared : null;
}

export function refuseImplementationWords(props: Readonly<Record<string, unknown>>): void {
	for (const [name, held] of Object.entries(props)) {
		const word = declarationIn(held)?.word;
		if (!word || WIDGET_WORDS.includes(word)) continue;
		const fits = word === "takes" ? "ICommand.sends" : "IQuery.expects";
		const said = `${word === "takes" ? "ICommand" : "IQuery"}.${word}`;
		throw new Error(
			IMPLEMENTATION_WORD_IN_WIDGET.replace("{name}", name).replace("{word}", said).replace("{fits}", fits),
		);
	}
}

export function defaultOf(declaration: Declaration): unknown {
	if (declaration.kind === "collection") return declaration.rows ?? [];
	const parsed = declaration.schema.safeParse(undefined);
	return parsed.success ? parsed.data : undefined;
}

function isDeclaration(held: unknown): held is Declaration {
	return typeof held === "object" && held !== null && "kind" in held && typeof held.kind === "string";
}
