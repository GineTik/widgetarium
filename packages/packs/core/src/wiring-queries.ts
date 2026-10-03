import { canOf } from "@widgetarium/core/gateway/create.js";
import type {
	CanResult,
	CollectionGateway,
	Query,
	RecordRef,
	Row,
	RowsResult,
	ValueGateway,
} from "@widgetarium/core/gateway/contract.js";
import { ICrudGateway, IValueGateway } from "@widgetarium/core/gateway/declared.js";
import type { EveryValueVerb } from "@widgetarium/core/gateway/needs.js";
import { refCollection, refValue } from "@widgetarium/core/gateway/refs.js";
import { callVerbOf, verbOf } from "@widgetarium/core/gateway/verbs-of.js";
import { stringIn } from "@widgetarium/core/engine/held-text.js";
import type { HostFields } from "@widgetarium/core/engine/host-context.js";
import type { QueryPorts } from "@widgetarium/core/engine/packs.js";
import { propRefIn } from "@widgetarium/core/engine/prop-ref.js";
import { createPickedGateway, selectionGateway } from "./picked.js";
import { selectedRowPicking, selectionPicking } from "./row-picking.js";
import type { PickingFields } from "./row-picking.js";
import { typedValueGateway } from "./typed-gateway.js";

type Cell = ValueGateway<unknown, EveryValueVerb>;

export class FromTileValueQuery extends IValueGateway {
	private readonly held: Cell;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		this.held = refValue(ports.refs, propRefIn(fields.ref, "ref", new.target.name));
	}

	get(): Promise<unknown> {
		return this.held.get();
	}

	update(next: unknown): Promise<unknown> {
		return this.held.update(next);
	}

	remove(): Promise<void> {
		return this.held.remove();
	}

	override subscribe(changed: () => void): () => void {
		return this.held.subscribe(() => changed());
	}
}

export class FromTileRowsQuery extends ICrudGateway {
	private readonly rows: CollectionGateway<unknown>;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		this.rows = refCollection(ports.refs, propRefIn(fields.ref, "ref", new.target.name));
	}

	list(query?: Query): Promise<RowsResult<unknown>> {
		return this.rows.list(query);
	}

	get(ref: RecordRef): Promise<Row<unknown> | null> {
		return this.rows.get(ref);
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

	repairIds(): unknown {
		return callVerbOf(this.rows, "repairIds");
	}

	can(verb: string): CanResult {
		return canOf(verbOf(this.rows, verb));
	}

	override subscribe(changed: () => void): () => void {
		return this.rows.subscribe(() => changed());
	}
}

export class SelectedRowQuery extends IValueGateway {
	private readonly picked: Cell;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		const { refs, self, screen } = ports;
		const rows = propRefIn(fields.rows, "rows", new.target.name);
		const picked = fields.picked ? propRefIn(fields.picked, "picked", new.target.name) : "";
		this.picked = createPickedGateway({
			id: self,
			chosen: picked ? refValue(refs, picked) : screen.cell(`${self}#picked`),
			collection: refCollection(refs, rows),
			...selectedRowPicking(pickingFieldsOf(fields), (ref) => refs.read(ref)),
			...(ports.prop.isDeclaredSource ? { inTile: typedValueGateway(ports, ports.kept.read()) } : {}),
			watches: (listener) => refs.watch([rows, ...(picked ? [picked] : [])], () => listener({})),
		});
	}

	get(): Promise<unknown> {
		return this.picked.get();
	}

	update(patch: unknown): Promise<unknown> {
		return this.picked.update(patch);
	}

	can(verb: string): CanResult {
		return canOf(verbOf(this.picked, verb));
	}

	override subscribe(changed: () => void): () => void {
		return this.picked.subscribe(() => changed());
	}
}

// TRADE-OFF: the list is read back through the registry rather than closed over, because a stable id keeps the cache attached across a write and only a live read then sees the row that write just made
export class SelectionQuery extends IValueGateway {
	private readonly selection: Cell;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		const { refs, self, screen } = ports;
		const rows = propRefIn(fields.rows, "rows", new.target.name);
		this.selection = selectionGateway({
			id: self,
			memory: screen.cell(self),
			collection: refCollection(refs, rows),
			...selectionPicking(pickingFieldsOf(fields), (ref) => refs.read(ref)),
			watches: (listener) => refs.watch([rows], () => listener({})),
		});
	}

	get(): Promise<unknown> {
		return this.selection.get();
	}

	update(ref: unknown): Promise<unknown> {
		return this.selection.update(ref);
	}

	remove(): Promise<void> {
		return this.selection.remove();
	}

	override subscribe(changed: () => void): () => void {
		return this.selection.subscribe(() => changed());
	}
}

function pickingFieldsOf(fields: HostFields): PickingFields {
	return {
		whenNothingPicked: fields.whenNothingPicked,
		fieldFrom: stringIn(fields.fieldFrom) ?? null,
		field: stringIn(fields.field) ?? null,
	};
}
