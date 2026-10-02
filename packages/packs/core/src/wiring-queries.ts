import {
	createPickedGateway,
	refCollection,
	refOf,
	refValue,
	selectionGateway,
} from "@widgetarium/core/gateway/refs.js";
import { stringIn } from "@widgetarium/core/engine/held-text.js";
import { propRefIn } from "@widgetarium/core/engine/prop-ref.js";
import { selectedRowPicking, selectionPicking } from "@widgetarium/core/engine/row-picking.js";
import type { PickingFields } from "@widgetarium/core/engine/row-picking.js";
import { EngineBackedRows, EngineBackedValue } from "@widgetarium/core/engine/engine-backed.js";
import type { HostFields, HostGateway, ImplementationContext } from "@widgetarium/core/engine/engine-backed.js";
import { createTypedGateway } from "./typed-gateway.js";

export class FromTileValueQuery extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return refValue(context.refs, propRefIn(fields.ref, "ref", this.name));
	}
}

export class FromTileRowsQuery extends EngineBackedRows {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return refCollection(context.refs, propRefIn(fields.ref, "ref", this.name));
	}
}

export class SelectedRowQuery extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { refs, tile, name, cellFor } = context;
		const own = refOf(tile.id, name);
		const rows = propRefIn(fields.rows, "rows", this.name);
		const picked = fields.picked ? propRefIn(fields.picked, "picked", this.name) : "";
		const inTile = context.tileConfig ? createTypedGateway({ ...context, config: context.tileConfig }) : null;
		return createPickedGateway({
			id: `${own}?selected-from=${rows}&by=${picked || "screen"}${inTile ? `&kept=${inTile.id}` : ""}`,
			chosen: picked ? refValue(refs, picked) : cellFor(`${own}#picked`),
			collection: refCollection(refs, rows),
			...selectedRowPicking(pickingFieldsOf(fields), (ref) => refs.read(ref)),
			...(inTile?.kind === "value" ? { inTile } : {}),
			watches: (listener) => refs.watch([rows, ...(picked ? [picked] : [])], () => listener({})),
		});
	}
}

// TRADE-OFF: the list is read back through the registry rather than closed over, because a stable id keeps the cache attached across a write and only a live read then sees the row that write just made
export class SelectionQuery extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { refs, tile, name, cellFor } = context;
		const own = refOf(tile.id, name);
		const rows = propRefIn(fields.rows, "rows", this.name);
		return selectionGateway({
			id: own,
			memory: cellFor(own),
			collection: refCollection(refs, rows),
			...selectionPicking(pickingFieldsOf(fields), (ref) => refs.read(ref)),
			watches: (listener) => refs.watch([rows], () => listener({})),
		});
	}
}

function pickingFieldsOf(fields: HostFields): PickingFields {
	return {
		whenNothingPicked: fields.whenNothingPicked,
		fieldFrom: stringIn(fields.fieldFrom) ?? null,
		field: stringIn(fields.field) ?? null,
	};
}
