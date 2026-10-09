import { z } from "zod";
import type { Query, RowsResult } from "./contract";
import { BARE_QUERY, DECLARATION } from "./declaration";
import type { Declaration } from "./declaration";
import { IBaseGateway } from "./declared";
import type { AbstractOf, Answer, RefReserved } from "./declared";
import type { CommandInputDeclared, commandInput, commandOutput, QueryDeclared, QueryHeldOf } from "./declared-types";
import { innerOf } from "./written";

export abstract class QueryRowsContract<T> extends IBaseGateway {
	abstract list(query?: Query): Answer<RowsResult<T>>;
}

export abstract class QueryValueContract<T> extends IBaseGateway {
	abstract get(): Answer<T | null>;
}

export abstract class CommandContract<I, O = void> extends (IBaseGateway as AbstractOf<IBaseGateway>) {
	abstract run(input: I): Answer<O>;
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

const OUTPUT_TRANSFORMS =
	".output() refuses a schema holding a transform or a pipe ({at}): an output is parsed by the handler and again by the widget, so it must parse to itself — convert the value in run() or draw(), and keep .output() to shapes, .default and .catch";

const WRAPPER_TYPES = new Set(["optional", "nullable", "default", "catch", "readonly", "nonoptional", "prefault"]);
const TRANSFORMING_TYPES = new Set(["pipe", "transform"]);

Object.defineProperty(QueryRowsContract, DECLARATION, { value: ROWS_QUERY });
Object.defineProperty(QueryValueContract, DECLARATION, { value: VALUE_QUERY });
Object.defineProperty(CommandContract, DECLARATION, { value: BARE_COMMAND });

export interface QueryInputDeclared {
	output<const S extends z.ZodType>(schema: S & RefReserved<QueryHeldOf<S>>): QueryDeclared<S>;
}

export abstract class IQuery extends (IBaseGateway as AbstractOf<IBaseGateway>) {
	declare static readonly schemaMissing: "a query needs a shape: write IQuery.output(schema)";

	static output<const S extends z.ZodType>(schema: S & RefReserved<QueryHeldOf<S>>): QueryDeclared<S> {
		refuseTransformingOutput(schema);
		return createQueryClass({ schema }) as QueryDeclared<S>;
	}

	static outputWithin<const B extends z.ZodType>(bound: B): QueryDeclared<B> {
		return createQueryClass({ schema: bound, isBound: true }) as QueryDeclared<B>;
	}

	static input(input: z.ZodType): QueryInputDeclared {
		return withOutput({}, (schema) => createQueryClass({ schema, input })) as QueryInputDeclared;
	}
}

export abstract class ICommand extends (CommandContract as AbstractOf<CommandContract<void>>) {
	declare static readonly [commandInput]?: void;
	declare static readonly [commandOutput]?: void;

	static input<const I extends z.ZodType>(input: I): CommandInputDeclared<I> {
		const declaration: Declaration = { ...BARE_COMMAND, schema: input };
		return withOutput(createDeclaredClass(CommandContract, declaration), (output) =>
			createDeclaredClass(CommandContract, { ...declaration, output }),
		) as CommandInputDeclared<I>;
	}
}

Object.defineProperty(IQuery, BARE_QUERY, { value: true });
Object.defineProperty(ICommand, DECLARATION, { value: BARE_COMMAND });

function withOutput<T extends object>(
	target: T,
	declare: (output: z.ZodType) => AbstractOf<IBaseGateway>,
): T & { readonly output: (output: z.ZodType) => AbstractOf<IBaseGateway> } {
	const output = (schema: z.ZodType): AbstractOf<IBaseGateway> => {
		refuseTransformingOutput(schema);
		return declare(schema);
	};
	return Object.defineProperty(target, "output", { value: output }) as T & { readonly output: typeof output };
}

function refuseTransformingOutput(schema: z.ZodType): void {
	const at = transformingPathIn(schema, "output", new Set());
	if (at !== null) throw new Error(OUTPUT_TRANSFORMS.replace("{at}", at));
}

function transformingPathIn(schema: unknown, at: string, seen: Set<unknown>): string | null {
	if (seen.has(schema)) return null;
	seen.add(schema);
	const def: unknown = Reflect.get(Object(Reflect.get(Object(schema), "_zod")), "def");
	const type: unknown = Reflect.get(Object(def), "type");
	if (typeof type !== "string") return null;
	if (TRANSFORMING_TYPES.has(type)) return at;
	for (const [step, part] of partsOf(type, def)) {
		const found = transformingPathIn(part, `${at}${step}`, seen);
		if (found !== null) return found;
	}
	return null;
}

function partsOf(type: string, def: unknown): readonly (readonly [string, unknown])[] {
	const field = (name: string): unknown => Reflect.get(Object(def), name);
	if (WRAPPER_TYPES.has(type)) return [["", field("innerType")]];
	if (type === "array") return [["[]", field("element")]];
	if (type === "record") return [["[*]", field("valueType")]];
	if (type === "object") return Object.entries(Object(field("shape"))).map(([key, part]) => [`.${key}`, part]);
	if (type === "union") return indexedParts(field("options"));
	if (type === "tuple") return indexedParts(field("items"));
	return [];
}

function indexedParts(parts: unknown): readonly (readonly [string, unknown])[] {
	return Array.isArray(parts) ? parts.map((part: unknown, index) => [`|${index}`, part] as const) : [];
}

type QueryShape = Pick<Declaration, "schema" | "input" | "isBound">;

function createQueryClass({ schema, ...shape }: QueryShape): AbstractOf<IBaseGateway> {
	const element = arrayElementOf(schema);
	if (!element) return createDeclaredClass(QueryValueContract, { ...VALUE_QUERY, ...shape, schema });
	const held = schema.safeParse(undefined);
	return createDeclaredClass(QueryRowsContract, {
		...ROWS_QUERY,
		...shape,
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
