import { createElement as h } from "react";
import { viewHost } from "./engine/view-host.js";
import { reactClash } from "./fit.js";
import { pageOf } from "./gateway/match";
import { slotDefaults } from "./gateway/props.js";
import { slotSurfaceOf } from "./surface-roles.js";
import { isPainted } from "./tree.js";
import { surfacedSlot } from "./widget-root.js";
import { spanToPixels } from "./paths.js";
import { typeOf } from "./engine/record-type.js";
import { NO_HOST } from "./engine/host-none.js";
import { NO_CATALOGUE } from "./engine/catalogue-none.js";
import { refusedRead } from "./engine/read-file.js";
import { collectionGateway, soloGateway } from "./gateway/create";
import { pickedGateway, selectionGateway } from "./gateway/refs";
import { mappedCollection } from "./gateway/mapped";
import { declaredOf, needsOf, storedRows } from "./gateway/props.js";

// A WIDGET DRAWN WITH NOBODY BEHIND IT. The catalogue shows a widget before it has a board, a
// folder or a person's notes — so everything it would normally read comes from its own manifest,
// and everything it would normally write is refused. Browsing must not be able to touch a vault.

// CONTEXT: the shape src/host.js hands a widget, built from a plain object instead of a file
// TRADE-OFF: needs comes from the types at publish, so nothing flattens props here and a widget reading a bare field would see nothing
function toRecord(row, index) {
	const path = row.path ?? `preview/${index + 1}.md`;
	const { path: given, body, ...props } = row;
	return {
		...props,
		path,
		ref: { path },
		props,
		name: props.title ?? path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, ""),
		type: typeOf(path),
		meta: { created: 0, modified: 0 },
		attachments: 0,
		body,
	};
}

function refuse(what) {
	return () => {
		console.warn(`Widgetarium: a preview cannot ${what} — it is a picture of a widget, not the widget`);
		return null;
	};
}

const previewPropId = (manifest, name) => `preview/${manifest?.id ?? "widget"}/${name}`;

const seededValue = (seeded, spec) => seeded?.value ?? declaredOf(spec) ?? null;

function seededRows(seeded, spec) {
	if (!Array.isArray(seeded?.rows)) return storedRows(declaredOf(spec) ?? [], spec);
	return seeded.rows.map(toRecord).map((record) => ({ ...record, ref: record.path }));
}

// CONTEXT: a preview gateway lists what the manifest offers and refuses every write by omission
function heldCollection(id, rows, spec) {
	const listing = collectionGateway({
		id,
		handlers: {
			list: (query) => ({ rows: pageOf(rows, query), total: rows.length }),
			get: (ref) => rows.find((row) => row.ref === ref) ?? null,
		},
	});
	return mappedCollection(listing, { needs: needsOf(spec) });
}

function heldByTheManifest(manifest, name, spec) {
	const seeded = manifest?.preview?.props?.[name];
	const id = previewPropId(manifest, name);
	if (spec?.kind === "value") return soloGateway(seededValue(seeded, spec), {}, id);
	return heldCollection(id, seededRows(seeded, spec), spec);
}

const fieldNameFor = (spec, gatewayFor) =>
	spec?.fieldFrom ? () => gatewayFor(spec.fieldFrom)?.get() ?? null : (spec?.field ?? null);

function selectionOverFirst(manifest, name, spec, gatewayFor) {
	return selectionGateway({
		id: previewPropId(manifest, name),
		memory: heldByTheManifest(manifest, name, { kind: "value" }),
		collection: gatewayFor(spec.of),
		fieldName: fieldNameFor(spec, gatewayFor),
		isFallbackToFirst: spec.fallback === "first",
	});
}

function rowPickedBySelection(manifest, name, spec, gatewayFor) {
	const picking = manifest?.props?.[spec.picks] ?? {};
	return pickedGateway({
		id: previewPropId(manifest, name),
		chosen: gatewayFor(spec.picks),
		collection: gatewayFor(spec.of),
		fieldName: fieldNameFor(picking, gatewayFor),
		isFallbackToFirst: (spec.fallback ?? picking.fallback) === "first",
		inTile: heldByTheManifest(manifest, name, spec),
	});
}

const resolvesASelection = (spec, gatewayFor) => Boolean(spec?.of) && !spec?.picks && Boolean(gatewayFor(spec.of));

const resolvesAPickedRow = (spec, gatewayFor) =>
	Boolean(spec?.picks) && Boolean(gatewayFor(spec.picks)) && Boolean(gatewayFor(spec.of));

export function previewGateways(manifest) {
	const props = Object.entries(manifest?.props ?? {});
	const gateways = {};
	const gatewayFor = (name) => gateways[name] ?? null;

	for (const [name, spec] of props) gateways[name] = heldByTheManifest(manifest, name, spec);

	for (const [name, spec] of props) {
		if (resolvesASelection(spec, gatewayFor)) gateways[name] = selectionOverFirst(manifest, name, spec, gatewayFor);
	}

	for (const [name, spec] of props) {
		if (resolvesAPickedRow(spec, gatewayFor)) gateways[name] = rowPickedBySelection(manifest, name, spec, gatewayFor);
	}

	return gateways;
}

// CONTEXT: a picture of a widget still needs somewhere to BE — a passage when the preview is
// of text becoming a widget, an entry when it is of a tile
export function previewHere(content = null) {
	return {
		of: content === null ? "entry" : "passage",
		content,
		canUpdate: false,
		get: async () => ({ of: content === null ? "entry" : "passage", path: "preview.md", props: {}, content }),
		update: refuse("write what it is standing in"),
	};
}

export const previewNavigator = {
	canNavigate: false,
	resolve: () => null,
	navigate: () => {
		console.warn("Widgetarium: a preview cannot navigate — it is a picture of a widget, not the widget");
		return false;
	},
};

// CONTEXT: a preview reads the files its manifest declares, exactly as it reads the rows it declares
export function previewReader(manifest) {
	const declared = manifest?.preview?.files ?? {};
	return {
		canRead: true,
		async read(link) {
			const named = String(link ?? "").trim();
			const text = declared[named];
			if (text === undefined) return refusedRead(`${named || "that file"} is not in this preview`);
			return { ok: true, text, path: named, bytes: text.length, failure: null };
		},
	};
}

// TRADE-OFF: the real environment when there is one — a catalogue tile that cannot render
// markdown draws a widget nobody could judge
export function previewHost(host) {
	return host ? viewHost(host) : NO_HOST;
}

export function previewSize(manifest, cell, gap) {
	const size = manifest?.preview?.size ?? manifest?.defaultSize ?? { w: 4, h: 3 };
	return { w: size.w, h: size.h, width: spanToPixels(size.w, cell, gap), height: spanToPixels(size.h, cell, gap) };
}

// the props a widget needs to draw, with no board, no vault and no way back to either
export function previewProps(definition, options) {
	const manifest = definition?.manifest ?? {};

	const slots = {};
	for (const [name, spec] of Object.entries(manifest.slots ?? {})) {
		const child = options?.registry?.get(spec.default);
		const drawable = child?.component && !child.error && !reactClash(definition?.react, child.react);
		const unfed = drawable ? slotDefaults(child.manifest, null) : {};
		const draw = (given) =>
			h(child.component, {
				...unfed,
				...given,
				size: { w: 1, h: 1, scale: 1 },
				host: previewHost(options?.host),
				here: previewHere(),
				navigator: previewNavigator,
			});
		const surface = slotSurfaceOf(spec, null);
		slots[name] = drawable ? surfacedSlot(draw, { surface, isCard: isPainted({ surface }) }) : null;
	}

	const content = manifest.inline ? (manifest.preview?.content ?? manifest.title ?? "Sample text") : null;

	return {
		...previewGateways(manifest),
		here: previewHere(content),
		navigator: previewNavigator,
		reader: previewReader(manifest),
		content,
		size: {
			w: manifest.preview?.size?.w ?? 4,
			h: manifest.preview?.size?.h ?? 3,
			scale: 1,
			isCollapsed: false,
			collapse() {},
			expand() {},
		},
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host: previewHost(options?.host),
		catalogue: NO_CATALOGUE,
		foldIntoGroup: () => false,
		slots,
		mounts: {},
	};
}
