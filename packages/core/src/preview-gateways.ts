import { pageOf } from "./gateway/match";
import { collectionGateway, rowOf, soloGateway } from "./gateway/create";
import { createGatewayRefs, createViewCells, refOf } from "./gateway/refs";
import type { GatewayRefs } from "./gateway/refs";
import { mapCollection } from "./gateway/mapped";
import { declaredOf, needsOf } from "./gateway/props.js";
import type { DeclaredGateway, DeclaredProp } from "./gateway/props.js";
import { storedRows } from "./gateway/kept-in-tile.js";
import type { StoredRow } from "./gateway/kept-in-tile.js";
import type { CollectionGateway } from "./gateway/contract";
import type { TileProp, TileProps } from "./model.js";
import type { Fields } from "./engine/catalogue-index.js";
import type { HostGatewayContext, HostGatewayHost, PatchStep } from "./engine/host-context.js";
import { resolveHostGateway } from "./engine/host-gateways.js";
import { typeOf } from "./engine/record-type.js";
import { isObject } from "./engine/is-object.js";
import { isHostSpec } from "./surface/prop-gateway.js";

export type PreviewGateways = Record<string, DeclaredGateway>;

type GatewayFor = (name: string | null | undefined) => DeclaredGateway | null;

type PreviewWorld = Omit<HostGatewayContext, "name" | "spec">;

const SELECTION = "@core/selection";

const SELECTED_ROW = "@core/selected-row";

const PREVIEW_READS_NO_VAULT = "a preview reads no vault";

const PREVIEW_HOST: HostGatewayHost = {
	slot: () => {
		throw new Error(PREVIEW_READS_NO_VAULT);
	},
};

interface PreviewRecord {
	readonly [field: string]: unknown;
	readonly path: string;
}

export function previewGateways(manifest: Fields | null | undefined): PreviewGateways {
	const props = declaredPropsIn(manifest);
	const gateways: PreviewGateways = {};
	const gatewayFor: GatewayFor = (name) => (name ? (gateways[name] ?? null) : null);

	for (const [name, spec] of props) gateways[name] = createManifestGateway(manifest, name, spec);

	const world = createPreviewWorld(manifest, props, gateways);
	for (const [name, spec] of props.filter(([, spec]) => isSelecting(spec, gatewayFor)))
		resolveInPreview(world, gateways, name, spec);

	for (const [name, spec] of props.filter(([, spec]) => isPickingARow(spec, gatewayFor)))
		resolveInPreview(world, gateways, name, spec);

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
	return refOf(previewTileId(manifest), name);
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

function createPreviewWorld(
	manifest: Fields | null | undefined,
	props: readonly [string, DeclaredProp][],
	gateways: PreviewGateways,
): PreviewWorld {
	const tile = { id: previewTileId(manifest), props: keptInPreview(manifest, props) };
	return {
		tile,
		refs: refsOverPreview(tile.id, gateways),
		host: PREVIEW_HOST,
		cellFor: screenSeededBy(manifest, tile.id, props),
		...propsKeptBy(tile.props),
	};
}

function propsKeptBy(props: TileProps): Pick<PreviewWorld, "propsRef" | "patchProp"> {
	const propsRef: { current: TileProps } = { current: props };
	const patchProp = (name: string, step: PatchStep): void => {
		propsRef.current = { ...propsRef.current, [name]: step(propsRef.current[name]) };
	};
	return { propsRef, patchProp };
}

function resolveInPreview(world: PreviewWorld, gateways: PreviewGateways, name: string, spec: DeclaredProp): void {
	if (!isHostSpec(spec)) return;
	const gateway = resolveHostGateway({ ...world, name, spec });
	world.refs.put(refOf(world.tile.id, name), gateway);
	gateways[name] = gateway;
}

function refsOverPreview(tileId: string, gateways: PreviewGateways): GatewayRefs {
	const refs = createGatewayRefs();
	for (const [name, gateway] of Object.entries(gateways)) refs.put(refOf(tileId, name), gateway);
	return refs;
}

function keptInPreview(manifest: Fields | null | undefined, props: readonly [string, DeclaredProp][]): TileProps {
	return Object.fromEntries(
		props.flatMap(([name]): [string, TileProp][] => {
			const value = seededIn(manifest, name)?.["value"];
			return value === undefined ? [] : [[name, { fields: { value } }]];
		}),
	);
}

function screenSeededBy(
	manifest: Fields | null | undefined,
	tileId: string,
	props: readonly [string, DeclaredProp][],
): HostGatewayContext["cellFor"] {
	const cellFor = createViewCells();
	for (const [name, spec] of props) {
		const seeded = seededIn(manifest, name)?.["value"];
		if (implementationOf(spec) === SELECTION && seeded !== undefined && seeded !== null)
			void cellFor(refOf(tileId, name)).update(seeded);
	}
	return cellFor;
}

function previewTileId(manifest: Fields | null | undefined): string {
	return `preview/${String(manifest?.["id"] ?? "widget")}`;
}

function siblingNamed(spec: DeclaredProp, field: string): string | null {
	const source = spec.source;
	const fields = isObject(source) ? source["fields"] : null;
	const named = isObject(fields) ? fields[field] : null;
	return typeof named === "string" ? named : null;
}

function implementationOf(spec: DeclaredProp): unknown {
	return isObject(spec.source) ? spec.source["implementation"] : undefined;
}

function isSelecting(spec: DeclaredProp, gatewayFor: GatewayFor): boolean {
	if (implementationOf(spec) !== SELECTION) return false;
	return gatewayFor(siblingNamed(spec, "rows"))?.kind === "collection";
}

function isPickingARow(spec: DeclaredProp, gatewayFor: GatewayFor): boolean {
	if (implementationOf(spec) !== SELECTED_ROW) return false;
	const chosen = gatewayFor(siblingNamed(spec, "picked"));
	const collection = gatewayFor(siblingNamed(spec, "rows"));
	return chosen?.kind === "value" && collection?.kind === "collection";
}
