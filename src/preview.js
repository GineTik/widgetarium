import { createElement as h } from "react";
import { viewHost } from "./engine/view-host.js";
import { spanToPixels } from "./layout.js";
import { typeOf } from "./engine/record-type.js";
import { NO_HOST } from "./engine/host-none.js";
import { refusedRead } from "./engine/read-file.js";
import { collectionGateway, soloGateway } from "./gateway/create";
import { mappedCollection } from "./gateway/mapped";
import { storedRows } from "./gateway/props.js";

// A WIDGET DRAWN WITH NOBODY BEHIND IT. The catalogue shows a widget before it has a board, a
// folder or a person's notes — so everything it would normally read comes from its own manifest,
// and everything it would normally write is refused. Browsing must not be able to touch a vault.

// CONTEXT: the shape src/host.js hands a widget, built from a plain object instead of a file
function toRecord(row, index) {
	const path = row.path ?? `preview/${index + 1}.md`;
	const { path: given, body, ...props } = row;
	return {
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

// CONTEXT: a preview gateway lists what the manifest offers and refuses every write by omission
export function previewGateways(manifest) {
	const declared = manifest?.preview?.props ?? {};
	const gateways = {};
	for (const [name, spec] of Object.entries(manifest?.props ?? {})) {
		const id = `preview/${manifest?.id ?? "widget"}/${name}`;
		if (spec?.kind === "value") {
			gateways[name] = soloGateway(declared[name]?.value ?? spec?.default?.value ?? null, {}, id);
			continue;
		}
		const rows = declared[name]?.rows
			? declared[name].rows.map(toRecord).map((record) => ({ ref: record.path, value: record }))
			: storedRows(spec?.default?.value ?? [], spec);
		const listing = collectionGateway({
			id,
			handlers: {
				list: (query) => ({ rows: query?.limit ? rows.slice(0, query.limit) : rows, total: rows.length }),
				get: (ref) => rows.find((row) => row.ref === ref) ?? null,
			},
		});
		gateways[name] = mappedCollection(listing, { needs: spec?.needs ?? {} });
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
		slots[name] = child?.component && !child.error
			? (given) => h(child.component, { ...given, size: { w: 1, h: 1, scale: 1 }, host: previewHost(options.host) })
			: null;
	}

	const content = manifest.inline ? (manifest.preview?.content ?? manifest.title ?? "Sample text") : null;

	return {
		...previewGateways(manifest),
		here: previewHere(content),
		navigator: previewNavigator,
		reader: previewReader(manifest),
		content,
		size: { w: manifest.preview?.size?.w ?? 4, h: manifest.preview?.size?.h ?? 3, scale: 1, isCollapsed: false, collapse() {}, expand() {} },
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host: previewHost(options?.host),
		foldIntoGroup: () => false,
		slots,
		mounts: {},
	};
}
