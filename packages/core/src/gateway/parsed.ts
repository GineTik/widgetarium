import { z } from "zod";
import type { CollectionGateway, Query, Row, RowsResult, ValueGateway } from "./contract";
import type { EveryValueVerb } from "./needs";
import { collectionGateway, valueGateway } from "./create";
import type { GatewayContext } from "./problems";

const WRITE_REFUSED = 'prop "{name}" refused a {verb} its schema does not accept: {issues}';

export interface Schemas {
	readonly schema: z.ZodType;
	readonly create?: z.ZodType | undefined;
	readonly update?: z.ZodType | undefined;
}

type Verb = ((input: unknown) => Promise<unknown>) & {
	can(): { can: boolean };
	meta?: { readNow?: (input: unknown) => unknown };
};

type Cans = Record<string, () => { can: true } | { can: false; reason: string }>;

interface HeldGateway {
	readonly id: string;
	readonly subscribe?: CollectionGateway<unknown>["subscribe"];
}

type HeldRow = Row<unknown> & Record<string, unknown>;

const NOT_A_VERB = ["list", "get", "id", "kind", "subscribe"];

export function checkCollectionWrites<T>(
	gateway: CollectionGateway<T>,
	schemas: Schemas,
	name: string,
): CollectionGateway<T> {
	if (isOpen(schemas.schema) && !schemas.create && !schemas.update) return gateway;
	const { verbs, passed, cans } = handlersOf(gateway as unknown as HeldGateway);
	return collectionGateway<T>({
		id: `${gateway.id}#checked`,
		handlers: {
			...passed,
			...checkWrites(passed, schemas, name),
			list: readsOf(verbs["list"], (result) => result),
			get: readsOf(verbs["get"], (row) => row),
		},
		settlesNow: Boolean(verbs["list"]?.meta?.readNow),
		cans,
		subscribe: gateway.subscribe,
	});
}

export function checkValueUpdate<U extends Verb>(update: U, schemas: Schemas, name: string): U {
	const schema = schemas.update ?? schemas.schema;
	return Object.assign(async (value: unknown) => update(checkInput(schema, value, "update", name)), {
		can: () => update.can(),
		meta: update.meta,
	}) as unknown as U;
}

export function parseReadsBy<Held extends HeldGateway>(
	gateway: Held,
	context: GatewayContext,
	kind: "collection" | "value",
): Held | CollectionGateway<unknown> | ValueGateway<unknown, EveryValueVerb> {
	if (isOpen(context.schema)) return gateway;
	const { verbs, passed, cans } = handlersOf(gateway);
	const common = {
		id: `${gateway.id}#parsed`,
		settlesNow: Boolean((verbs[kind === "collection" ? "list" : "get"] as Verb | undefined)?.meta?.readNow),
		cans,
		...(gateway.subscribe ? { subscribe: gateway.subscribe } : {}),
	};
	if (kind === "value")
		return valueGateway({
			...common,
			handlers: { ...passed, get: readsOf(verbs["get"], (value) => parseValue(value, context)) },
		});
	return collectionGateway({
		...common,
		handlers: {
			...passed,
			list: readsOf(verbs["list"], (result, query) =>
				parseRows(result as RowsResult<unknown>, context, query as Query | undefined),
			),
			get: readsOf(verbs["get"], (row) => (row ? parseRow(row as HeldRow, context) : null)),
		},
	});
}

function handlersOf(gateway: HeldGateway) {
	const verbs = gateway as unknown as Record<string, Verb | undefined>;
	const writes = Object.keys(gateway).filter((key) => !NOT_A_VERB.includes(key) && typeof verbs[key] === "function");
	const passed = Object.fromEntries(writes.map((verb) => [verb, (input: unknown) => verbs[verb]?.(input)]));
	const cans = Object.fromEntries(
		writes.filter((verb) => typeof verbs[verb]?.can === "function").map((verb) => [verb, () => verbs[verb]?.can()]),
	) as Cans;
	return { verbs, passed, cans };
}

function parseValue(value: unknown, context: GatewayContext) {
	if (value === null || value === undefined) return null;
	return context.parse(value, { label: "the value" });
}

function parseRows(
	result: RowsResult<unknown>,
	context: GatewayContext,
	query: Query | undefined,
): RowsResult<unknown> {
	const held = result.rows as HeldRow[];
	const rows = held.flatMap((row) => {
		const parsed = parseRow(row, context);
		return parsed ? [parsed] : [];
	});
	const isWhole = !query?.offset && !query?.where?.length && held.length >= result.total;
	if (isWhole) context.keepOnly(held.map((row) => ({ label: labelOf(row), ref: row.ref })));
	return { ...result, rows: rows as Row<unknown>[] };
}

function parseRow(row: HeldRow, context: GatewayContext): HeldRow | null {
	const primitive = isPrimitiveRow(row, context.schema);
	const parsed = context.parse<Record<string, unknown>>(primitive ? row["value"] : row, {
		label: labelOf(row),
		ref: row.ref,
	});
	if (parsed === null) return null;
	return (primitive ? { value: parsed, ref: row.ref } : { ...parsed, ref: row.ref }) as HeldRow;
}

function labelOf(row: HeldRow): string {
	const named = row["path"] ?? row["name"];
	return typeof named === "string" && named !== "" ? named : String(row.ref);
}

function checkWrites(passed: Record<string, (input: unknown) => unknown>, schemas: Schemas, name: string) {
	const creates = schemas.create ?? partialOf(schemas.schema);
	const patches = partialOf(schemas.update ?? schemas.schema);
	const checked: Record<string, (input: unknown) => unknown> = {};
	const creating = (data: unknown) => checkInput(creates, data, "create", name);
	const patching = (patch: unknown) => {
		checkInput(patches, (patch as { data?: unknown } | null)?.data, "update", name);
		return patch;
	};
	const each = (check: (input: unknown) => unknown) => (inputs: unknown) =>
		Array.isArray(inputs) ? inputs.map(check) : inputs;
	const checks: Record<string, (input: unknown) => unknown> = {
		create: creating,
		update: patching,
		createMany: each(creating),
		updateMany: each(patching),
		upsert: patching,
	};
	for (const [verb, check] of Object.entries(checks)) {
		const write = passed[verb];
		if (write) checked[verb] = (input: unknown) => write(check(input));
	}
	return checked;
}

function checkInput(schema: z.ZodType, input: unknown, verb: string, name: string): unknown {
	if (isOpen(schema)) return input;
	const parsed = schema.safeParse(input);
	if (parsed.success) return input;
	const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || verb}: ${issue.message}`).join("; ");
	throw new Error(WRITE_REFUSED.replace("{name}", name).replace("{verb}", verb).replace("{issues}", issues));
}

function partialOf(schema: z.ZodType): z.ZodType {
	return schema instanceof z.ZodObject ? schema.partial() : schema;
}

function isOpen(schema: z.ZodType): boolean {
	return schema instanceof z.ZodUnknown || schema instanceof z.ZodAny;
}

function readsOf(read: Verb | undefined, parse: (held: unknown, input: unknown) => unknown) {
	const now = read?.meta?.readNow;
	if (now) return (input: unknown) => parse(now(input), input);
	return async (input: unknown) => parse(await read?.(input), input);
}

function isPrimitiveRow(row: HeldRow, schema: z.ZodType): boolean {
	if (schema instanceof z.ZodObject) return false;
	const keys = Object.keys(row);
	return keys.length === 2 && keys.includes("value") && keys.includes("ref");
}
