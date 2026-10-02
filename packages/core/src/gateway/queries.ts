import { z } from "zod";
import type { Query, RowsResult } from "./contract";
import { BARE_QUERY, DECLARATION } from "./declaration";
import type { Declaration, DeclaringWord } from "./declaration";
import { IBaseGateway } from "./declared";
import type { AbstractOf, Answer, RefReserved } from "./declared";
import type { Answering, CommandDeclared, commandInput, QueryDeclared, QueryHeldOf } from "./declared-types";
import { innerOf } from "./written";

export type CommandAnswer = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export abstract class QueryRowsContract<T> extends IBaseGateway {
	abstract list(query?: Query): Answer<RowsResult<T>>;
}

export abstract class QueryValueContract<T> extends IBaseGateway {
	abstract get(): Answer<T | null>;
}

export abstract class CommandContract<I> extends (IBaseGateway as AbstractOf<IBaseGateway>) {
	abstract run(input: I): Answer<void>;
}

const VALUE_QUERY: Declaration = { kind: "value", schema: z.unknown(), reads: ["get"], writes: [], isQuery: true };
const ROWS_QUERY: Declaration = {
	kind: "collection",
	schema: z.unknown(),
	reads: ["list"],
	writes: [],
	pickableWrites: [],
	isQuery: true,
};
const BARE_COMMAND: Declaration = { kind: "command", schema: z.undefined(), writes: ["run"] };

Object.defineProperty(QueryRowsContract, DECLARATION, { value: ROWS_QUERY });
Object.defineProperty(QueryValueContract, DECLARATION, { value: VALUE_QUERY });
Object.defineProperty(CommandContract, DECLARATION, { value: BARE_COMMAND });

export abstract class IQuery extends (IBaseGateway as AbstractOf<IBaseGateway>) {
	declare static readonly schemaMissing: "a query needs a shape: write IQuery.expects(schema)";

	static expects<const S extends z.ZodType>(schema: S & RefReserved<QueryHeldOf<S>>): QueryDeclared<S> {
		return createQueryClass(schema, { word: "expects" }) as QueryDeclared<S>;
	}

	static returns<const S extends z.ZodType>(schema: S & RefReserved<QueryHeldOf<S>>): QueryDeclared<S> & Answering {
		return createQueryClass(schema, { word: "returns" }) as QueryDeclared<S> & Answering;
	}

	static returnsAny<const B extends z.ZodType>(bound: B): QueryDeclared<B> & Answering {
		return createQueryClass(bound, { word: "returnsAny", isBound: true }) as QueryDeclared<B> & Answering;
	}
}

export abstract class ICommand extends (CommandContract as AbstractOf<CommandContract<void>>) {
	declare static readonly [commandInput]?: void;

	static sends<const S extends z.ZodType>(schema: S): CommandDeclared<z.input<S>> {
		return createCommandClass(schema, "sends") as CommandDeclared<z.input<S>>;
	}

	static takes<const S extends z.ZodType>(schema: S): CommandDeclared<z.output<S>> & Answering {
		return createCommandClass(schema, "takes") as CommandDeclared<z.output<S>> & Answering;
	}
}

Object.defineProperty(IQuery, BARE_QUERY, { value: true });
Object.defineProperty(ICommand, DECLARATION, { value: BARE_COMMAND });

type QueryWord = Pick<Declaration, "word" | "isBound">;

function createQueryClass(schema: z.ZodType, word: QueryWord): AbstractOf<IBaseGateway> {
	const element = arrayElementOf(schema);
	if (!element) return createDeclaredClass(QueryValueContract, { ...VALUE_QUERY, ...word, schema });
	const held = schema.safeParse(undefined);
	return createDeclaredClass(QueryRowsContract, {
		...ROWS_QUERY,
		...word,
		schema: element,
		...(held.success && Array.isArray(held.data) ? { rows: held.data } : {}),
	});
}

function createCommandClass(schema: z.ZodType, word: DeclaringWord): AbstractOf<IBaseGateway> {
	return createDeclaredClass(CommandContract, { ...BARE_COMMAND, word, schema });
}

function arrayElementOf(schema: z.ZodType): z.ZodType | null {
	if (schema instanceof z.ZodArray) return schema.element instanceof z.ZodType ? schema.element : null;
	const inner = innerOf(schema);
	return inner ? arrayElementOf(inner) : null;
}

function createDeclaredClass(base: AbstractOf<IBaseGateway>, declaration: Declaration): AbstractOf<IBaseGateway> {
	abstract class Declared extends base {}
	Object.defineProperty(Declared, DECLARATION, { value: declaration });
	return Declared;
}
