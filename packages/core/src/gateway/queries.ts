import { z } from "zod";
import type { Query, RowsResult } from "./contract";
import { BARE_QUERY, DECLARATION } from "./declaration";
import type { Declaration } from "./declaration";
import { IBaseGateway } from "./declared";
import type { AbstractOf, Answer, RefReserved } from "./declared";
import type { CommandDeclared, commandInput, QueryDeclared, QueryHeldOf } from "./declared-types";
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
	declare static readonly schemaMissing: "a query needs .of(schema): add the shape it returns";

	static of<const S extends z.ZodType>(schema: S & RefReserved<QueryHeldOf<S>>): QueryDeclared<S> {
		return createQueryClass(schema) as QueryDeclared<S>;
	}
}

export abstract class ICommand extends (CommandContract as AbstractOf<CommandContract<void>>) {
	declare static readonly [commandInput]?: void;

	static of<const S extends z.ZodType>(schema: S): CommandDeclared<z.input<S>> {
		return createDeclaredClass(CommandContract, { ...BARE_COMMAND, schema }) as CommandDeclared<z.input<S>>;
	}
}

Object.defineProperty(IQuery, BARE_QUERY, { value: true });
Object.defineProperty(ICommand, DECLARATION, { value: BARE_COMMAND });

function createQueryClass(schema: z.ZodType): AbstractOf<IBaseGateway> {
	const element = arrayElementOf(schema);
	if (!element) return createDeclaredClass(QueryValueContract, { ...VALUE_QUERY, schema });
	const held = schema.safeParse(undefined);
	return createDeclaredClass(QueryRowsContract, {
		...ROWS_QUERY,
		schema: element,
		...(held.success && Array.isArray(held.data) ? { rows: held.data } : {}),
	});
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
