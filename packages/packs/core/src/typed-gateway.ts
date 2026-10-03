import { stableKey } from "@widgetarium/core/gateway/cache.js";
import type { CollectionGateway, Row, RowsResult, ValueGateway } from "@widgetarium/core/gateway/contract.js";
import type { EveryValueVerb } from "@widgetarium/core/gateway/needs.js";
import { hardcodeCollection, hardcodeValue } from "@widgetarium/core/gateway/kept-in-tile.js";
import type { HardcodeOptions } from "@widgetarium/core/gateway/kept-in-tile.js";
import { narrowByRefs } from "@widgetarium/core/gateway/refs.js";
import { filterRowsIn } from "@widgetarium/core/engine/held-reading.js";
import type { HostFields } from "@widgetarium/core/engine/host-context.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { QueryPorts } from "@widgetarium/core/engine/packs.js";

type ReadNow = (input: unknown) => unknown;

export function typedValueGateway(ports: QueryPorts, rendered: unknown): ValueGateway<unknown, EveryValueVerb> {
	return hardcodeValue(keptIn(ports, rendered));
}

export function typedRowsGateway(ports: QueryPorts, fields: HostFields): CollectionGateway<unknown> {
	const where = [...ports.prop.where, ...filterRowsIn(fields.where)];
	return narrowByRefs(hardcodeCollection(keptIn(ports, fields.rows ?? ports.prop.declared)), where, ports.refs);
}

export function readNowOf(verb: unknown): ReadNow | null {
	const meta: unknown = typeof verb === "function" ? Reflect.get(verb, "meta") : undefined;
	const now = isObject(meta) ? meta["readNow"] : undefined;
	return typeof now === "function" ? (input) => Reflect.apply(now, meta, [input]) : null;
}

export function isRowsResult(held: unknown): held is RowsResult<unknown> {
	return isObject(held) && Array.isArray(held["rows"]) && typeof held["total"] === "number";
}

export function isRow(held: unknown): held is Row<unknown> {
	return isObject(held) && typeof held["ref"] === "string";
}

function keptIn(ports: QueryPorts, rendered: unknown): HardcodeOptions {
	const { self, kept, prop } = ports;
	return {
		id: `${self}?${stableKey(rendered)}`,
		readValue: () => kept.read() ?? prop.declared,
		mutateValue: (step) => kept.update((stored) => step(stored ?? rendered)),
		requested: prop.writes,
	};
}
