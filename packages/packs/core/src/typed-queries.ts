import type {
	CollectionGateway,
	Query,
	RecordRef,
	Row,
	RowsResult,
	ValueGateway,
} from "@widgetarium/core/gateway/contract.js";
import { ICrudGateway, IValueGateway } from "@widgetarium/core/gateway/declared.js";
import type { Answer } from "@widgetarium/core/gateway/declared.js";
import type { EveryValueVerb } from "@widgetarium/core/gateway/needs.js";
import { callVerbOf } from "@widgetarium/core/gateway/verbs-of.js";
import type { HostFields } from "@widgetarium/core/engine/host-context.js";
import type { QueryPorts } from "@widgetarium/core/engine/packs.js";
import { isRow, isRowsResult, readNowOf, typedRowsGateway, typedValueGateway } from "./typed-gateway.js";

export class TypedValueQuery extends IValueGateway {
	readonly settlesNow = true;

	private readonly typed: ValueGateway<unknown, EveryValueVerb>;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		this.typed = typedValueGateway(ports, fields.value ?? ports.prop.declared);
	}

	get(): unknown {
		const now = readNowOf(this.typed.get);
		return now ? now(undefined) : this.typed.get();
	}

	update(next: unknown): Promise<unknown> {
		return this.typed.update(next);
	}
}

export class TypedRowsQuery extends ICrudGateway {
	private readonly rows: CollectionGateway<unknown>;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		this.rows = typedRowsGateway(ports, fields);
	}

	get settlesNow(): boolean {
		return readNowOf(this.rows.list) !== null;
	}

	list(query?: Query): Answer<RowsResult<unknown>> {
		const read = readNowOf(this.rows.list)?.(query);
		return isRowsResult(read) ? read : this.rows.list(query);
	}

	get(ref: RecordRef): Answer<Row<unknown> | null> {
		const now = readNowOf(this.rows.get);
		if (!now) return this.rows.get(ref);
		const read = now(ref);
		return isRow(read) ? read : null;
	}

	create(draft: unknown): unknown {
		return callVerbOf(this.rows, "create", draft);
	}

	update(patch: unknown): unknown {
		return callVerbOf(this.rows, "update", patch);
	}

	remove(ref: unknown): unknown {
		return callVerbOf(this.rows, "remove", ref);
	}

	replace(rows: unknown): unknown {
		return callVerbOf(this.rows, "replace", rows);
	}

	override subscribe(changed: () => void): () => void {
		return this.rows.subscribe(() => changed());
	}
}

export class ScreenStateQuery extends IValueGateway {
	private readonly cell: ValueGateway<unknown, EveryValueVerb>;

	constructor(_fields: HostFields, ports: QueryPorts) {
		super();
		this.cell = ports.screen.cell(ports.self);
	}

	get(): Promise<unknown> {
		return this.cell.get();
	}

	update(next: unknown): Promise<unknown> {
		return this.cell.update(next);
	}

	remove(): Promise<void> {
		return this.cell.remove();
	}

	override subscribe(changed: () => void): () => void {
		return this.cell.subscribe(() => changed());
	}
}
