import { pageOf } from "./gateway/match";
import { collectionGateway, rowOf, soloGateway } from "./gateway/create";
import { createPickedGateway, selectionGateway } from "./gateway/refs";
import { mapCollection } from "./gateway/mapped";
import { declaredOf, needsOf, storedRows } from "./gateway/props.js";
import type { DeclaredGateway, DeclaredProp, StoredRow } from "./gateway/props.js";
import type { CollectionGateway, ValueGateway } from "./gateway/contract";
import type { EveryValueVerb } from "./gateway/needs";
import { selectedRowPicking, selectionPicking } from "./engine/row-picking.js";
import type { PickingFields, RowPicking } from "./engine/row-picking.js";
import type { Fields } from "./engine/catalogue-index.js";
import { typeOf } from "./engine/record-type.js";
import { isObject } from "./engine/is-object.js";

export type PreviewGateways = Record<string, DeclaredGateway>;

type GatewayFor = (name: string | null | undefined) => DeclaredGateway | null;

type AwaitedPicking = {
	readonly fieldName: string | null | (() => Promise<unknown>);
	readonly isFallbackToFirst: boolean;
};

interface SourceFields extends PickingFields {
	readonly rows?: string | null;
	readonly picked?: string | null;
}

interface PreviewRecord {
	readonly [field: string]: unknown;
	readonly path: string;
}

export function previewGateways(manifest: Fields | null | undefined): PreviewGateways {
	const props = declaredPropsIn(manifest);
	const gateways: PreviewGateways = {};
	const gatewayFor: GatewayFor = (name) => (name ? (gateways[name] ?? null) : null);

	for (const [name, spec] of props) gateways[name] = createManifestGateway(manifest, name, spec);

	for (const [name, spec] of props) {
		const selecting = resolvesASelection(spec, gatewayFor);
		if (selecting) gateways[name] = selectionOverFirst(manifest, name, spec, selecting, gatewayFor);
	}

	for (const [name, spec] of props) {
		const picking = resolvesAPickedRow(spec, gatewayFor);
		if (picking) gateways[name] = createSelectedRowGateway(manifest, name, spec, picking, gatewayFor);
	}

	return gateways;
}

export function declaredPropsIn(manifest: Fields | null | undefined): [string, DeclaredProp][] {
	const props = manifest?.["props"];
	if (!isObject(props)) return [];
	return Object.entries(props).flatMap(([name, spec]) =>
		isDeclaredProp(spec) ? [[name, spec] as [string, DeclaredProp]] : [],
	);
}

function isDeclaredProp(spec: unknown): spec is DeclaredProp {
	if (!isObject(spec)) return false;
	const { describes, writes } = spec;
	return (
		(describes === undefined || describes === null || isObject(describes)) &&
		(spec["default"] === undefined || spec["default"] === null || isObject(spec["default"])) &&
		(writes === undefined || writes === null || Array.isArray(writes))
	);
}

// TRADE-OFF: needs comes from the types at publish, so nothing flattens props here and a widget reading a bare field would see nothing
function toRecord(row: unknown, index: number): PreviewRecord {
	const held = isObject(row) ? row : {};
	const given = held["path"];
	const path = typeof given === "string" ? given : `preview/${index + 1}.md`;
	const { path: _given, body, ...props } = held;
	return {
		...props,
		path,
		ref: { path },
		props,
		name: props["title"] ?? path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, ""),
		type: typeOf(path),
		meta: { created: 0, modified: 0 },
		attachments: 0,
		body,
	};
}

function previewPropId(manifest: Fields | null | undefined, name: string): string {
	return `preview/${String(manifest?.["id"] ?? "widget")}/${name}`;
}

function seededIn(manifest: Fields | null | undefined, name: string): Fields | null {
	const preview = manifest?.["preview"];
	const props = isObject(preview) ? preview["props"] : null;
	const seeded = isObject(props) ? props[name] : null;
	return isObject(seeded) ? seeded : null;
}

function seededValue(seeded: Fields | null, spec: DeclaredProp): unknown {
	return seeded?.["value"] ?? declaredOf(spec) ?? null;
}

function seededRows(seeded: Fields | null, spec: DeclaredProp): StoredRow[] {
	const rows = seeded?.["rows"];
	if (!Array.isArray(rows)) return storedRows(declaredOf(spec) ?? []);
	return rows.map(toRecord).map((record) => rowOf<unknown>(record, record.path));
}

function createHeldCollection(id: string, rows: readonly StoredRow[], spec: DeclaredProp): CollectionGateway<unknown> {
	const listing = collectionGateway<unknown>({
		id,
		handlers: {
			list: (query?: { offset?: number; limit?: number } | null) => ({
				rows: pageOf([...rows], query),
				total: rows.length,
			}),
			get: (ref: unknown) => rows.find((row) => row.ref === ref) ?? null,
		},
	});
	return mapCollection(listing, { needs: needsOf(spec) });
}

function createManifestGateway(manifest: Fields | null | undefined, name: string, spec: DeclaredProp): DeclaredGateway {
	const seeded = seededIn(manifest, name);
	const id = previewPropId(manifest, name);
	if (spec.kind === "value") return soloGateway(seededValue(seeded, spec), {}, id);
	return createHeldCollection(id, seededRows(seeded, spec), spec);
}

function sourceFieldsOf(spec: DeclaredProp): SourceFields {
	const source = spec.source;
	const fields = isObject(source) ? source["fields"] : null;
	if (!isObject(fields)) return {};
	return {
		rows: textIn(fields["rows"]),
		picked: textIn(fields["picked"]),
		fieldFrom: textIn(fields["fieldFrom"]),
		field: textIn(fields["field"]),
		whenNothingPicked: fields["whenNothingPicked"],
	};
}

function textIn(held: unknown): string | null {
	return typeof held === "string" ? held : null;
}

function readFieldWith(gatewayFor: GatewayFor): (prop: string) => unknown {
	return (prop) => {
		const gateway = gatewayFor(prop);
		return gateway?.kind === "value" ? gateway.get() : null;
	};
}

function awaited(picking: RowPicking): AwaitedPicking {
	const named = picking.fieldName;
	if (typeof named !== "function") return { fieldName: named, isFallbackToFirst: picking.isFallbackToFirst };
	return { fieldName: async () => named(), isFallbackToFirst: picking.isFallbackToFirst };
}

function implementationOf(spec: DeclaredProp): unknown {
	return isObject(spec.source) ? spec.source["implementation"] : undefined;
}

function selectionOverFirst(
	manifest: Fields | null | undefined,
	name: string,
	spec: DeclaredProp,
	collection: CollectionGateway<unknown>,
	gatewayFor: GatewayFor,
): ValueGateway<unknown, EveryValueVerb> {
	return selectionGateway({
		id: previewPropId(manifest, name),
		memory: soloGateway(seededValue(seededIn(manifest, name), { kind: "value" }), {}, previewPropId(manifest, name)),
		collection,
		...awaited(selectionPicking(sourceFieldsOf(spec), readFieldWith(gatewayFor))),
	});
}

function createSelectedRowGateway(
	manifest: Fields | null | undefined,
	name: string,
	spec: DeclaredProp,
	{ chosen, collection }: PickedSources,
	gatewayFor: GatewayFor,
): ValueGateway<unknown, EveryValueVerb> {
	const inTile = createManifestGateway(manifest, name, spec);
	return createPickedGateway({
		id: previewPropId(manifest, name),
		chosen,
		collection,
		...awaited(selectedRowPicking(sourceFieldsOf(spec), readFieldWith(gatewayFor))),
		inTile: inTile.kind === "value" ? inTile : null,
	});
}

interface PickedSources {
	readonly chosen: ValueGateway<unknown, EveryValueVerb>;
	readonly collection: CollectionGateway<unknown>;
}

function resolvesASelection(spec: DeclaredProp, gatewayFor: GatewayFor): CollectionGateway<unknown> | null {
	if (implementationOf(spec) !== "@core/selection") return null;
	const rows = gatewayFor(sourceFieldsOf(spec).rows);
	return rows?.kind === "collection" ? rows : null;
}

function resolvesAPickedRow(spec: DeclaredProp, gatewayFor: GatewayFor): PickedSources | null {
	if (implementationOf(spec) !== "@core/selected-row") return null;
	const fields = sourceFieldsOf(spec);
	const chosen = gatewayFor(fields.picked);
	const collection = gatewayFor(fields.rows);
	if (chosen?.kind !== "value" || collection?.kind !== "collection") return null;
	return { chosen, collection };
}
