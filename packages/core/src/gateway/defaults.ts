import type { Query, RecordRef, Row, RowsResult } from "./contract";
import { rowOf, toRows } from "./create";
import { declarationIn } from "./declaration";
import { ICrudGateway, IListGateway, IValueGateway } from "./declared";
import { isMatch, pageOf, sortedRows } from "./match";

const DEFAULT_IMPLEMENTATION = Symbol.for("widgetarium.default-implementation");

type Changed = () => void;

type Constructed = abstract new (...given: never[]) => object;

export interface RowsFields<T = unknown> {
	readonly rows?: readonly T[];
}

export interface ValueFields<T = unknown> {
	readonly value?: T;
}

const NOT_AN_INTERFACE = "defineDefaultImplementation takes a gateway interface first — {name} is not one";
const MISSES_A_METHOD = "{implementation} cannot be the default of {interface}: it has no {verb}";
const NO_DEFAULT =
	'prop "{name}" is {interface}, which names no default implementation, so a plain value cannot stand for it — pass an implementation';

export function defineDefaultImplementation<I extends Constructed, C extends new (fields: never) => InstanceType<I>>(
	gatewayInterface: I,
	implementation: C,
): C {
	const declaration = declarationIn(gatewayInterface);
	if (!declaration) throw new Error(NOT_AN_INTERFACE.replace("{name}", gatewayInterface.name || "this class"));
	const missing = [...(declaration.reads ?? []), ...declaration.writes].find(
		(verb) => typeof (implementation.prototype as Record<string, unknown>)[verb] !== "function",
	);
	if (missing)
		throw new Error(
			MISSES_A_METHOD.replace("{implementation}", implementation.name)
				.replace("{interface}", gatewayInterface.name)
				.replace("{verb}", missing),
		);
	Object.defineProperty(gatewayInterface, DEFAULT_IMPLEMENTATION, { value: implementation, configurable: true });
	return implementation;
}

export function defaultImplementationFor(declared: unknown, name: string): new (fields: object) => object {
	for (let held = declared as { [DEFAULT_IMPLEMENTATION]?: unknown } | null; held; held = Object.getPrototypeOf(held)) {
		if (Object.prototype.hasOwnProperty.call(held, DEFAULT_IMPLEMENTATION))
			return held[DEFAULT_IMPLEMENTATION] as new (fields: object) => object;
	}
	throw new Error(
		NO_DEFAULT.replace("{name}", name).replace("{interface}", String((declared as { name?: string })?.name)),
	);
}

export class RowsInMemoryGateway extends ICrudGateway {
	readonly settlesNow = true;
	private rows: Row<unknown>[];
	private minted: number;
	private readonly listeners = new Listeners();

	constructor(fields: RowsFields = {}) {
		super();
		this.rows = toRows((fields.rows ?? []) as unknown[]);
		this.minted = this.rows.length;
	}

	list(query?: Query): RowsResult<unknown> {
		const matching = sortedRows(
			this.rows.filter((row) => isMatch(row, query?.where)),
			query?.sort,
		);
		return { rows: pageOf(matching, query), total: matching.length };
	}

	get(ref: RecordRef): Row<unknown> | null {
		return this.rows.find((row) => row.ref === ref) ?? null;
	}

	create(data: unknown): Row<unknown> {
		const row = rowOf(data, this.unusedRef());
		this.rows = [...this.rows, row];
		this.listeners.tell();
		return row;
	}

	update({ ref, data }: { ref: RecordRef; data: unknown }): Row<unknown> | null {
		const held = this.rows.find((row) => row.ref === ref);
		if (!held) return null;
		const patched = (
			typeof data === "object" && data !== null ? { ...held, ...data, ref } : rowOf(data, ref)
		) as Row<unknown>;
		this.rows = this.rows.map((row) => (row.ref === ref ? patched : row));
		this.listeners.tell();
		return patched;
	}

	remove(ref: RecordRef): void {
		this.rows = this.rows.filter((row) => row.ref !== ref);
		this.listeners.tell();
	}

	private unusedRef(): RecordRef {
		const isTaken = (ref: string) => this.rows.some((row) => row.ref === ref);
		while (isTaken(`i${this.minted}`)) this.minted += 1;
		this.minted += 1;
		return `i${this.minted - 1}` as RecordRef;
	}

	override subscribe(changed: Changed): () => void {
		return this.listeners.add(changed);
	}
}

export class ValueInMemoryGateway extends IValueGateway {
	readonly settlesNow = true;
	private value: unknown;
	private readonly listeners = new Listeners();

	constructor(fields: ValueFields = {}) {
		super();
		this.value = fields.value ?? null;
	}

	get(): unknown {
		return this.value;
	}

	update(value: unknown): unknown {
		this.value = value;
		this.listeners.tell();
		return value;
	}

	remove(): void {
		this.value = null;
		this.listeners.tell();
	}

	override subscribe(changed: Changed): () => void {
		return this.listeners.add(changed);
	}
}

class Listeners {
	private readonly held = new Set<Changed>();

	add(changed: Changed): () => void {
		this.held.add(changed);
		return () => this.held.delete(changed);
	}

	tell(): void {
		this.held.forEach((changed) => changed());
	}
}

defineDefaultImplementation(IValueGateway, ValueInMemoryGateway);
defineDefaultImplementation(IListGateway, RowsInMemoryGateway);
defineDefaultImplementation(ICrudGateway, RowsInMemoryGateway);
