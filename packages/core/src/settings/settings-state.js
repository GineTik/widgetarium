import { heldKey, heldTile, rekey } from "../model.js";
import { bindingOf, declaredOf, typedIn } from "../gateway/props.js";
import { seenOf } from "../prop-visibility.js";
import { barPlacement, CHROME } from "../settings-fit.js";
import { writtenText } from "./prop-writing.js";

const TABS = [
	{ value: "settings", label: "Settings" },
	{ value: "data", label: "Data" },
	{ value: "design", label: "Design" },
];

export function settingsState({ options, look, here, geometry, vaultFields, boxValues }) {
	const { path } = look.view;
	return {
		manifest: here.manifest,
		tile: here.tile,
		seen: seenOf(here.manifest, here.tile),
		onPatch: here.onPatch,
		crumbs: here.crumbs,
		fed: path.at(-1)?.fed ?? [],
		tabs: TABS,
		isMount: path.length > 0,
		enter: (step) => look.put({ path: [...path, step], tab: "settings", openRow: null, draft: "" }),
		popTo: (depth) => look.put({ path: path.slice(0, depth), tab: "settings", openRow: null, draft: "" }),
		...boardOptions(options, path),
		vaultFields,
		boxValues,
		...viewState(look, here, options.place),
		scale: geometry.scale,
		live: geometry.live,
		opening: geometry.opening,
		at: geometry.at,
		canNarrow: geometry.canNarrow,
		phone: options.phone,
		isCollapsed: Boolean(options.tile.folded),
		...chromeState(look, geometry.frame, options.phone),
	};
}

export function contextAt(options, path) {
	const root = options.definition?.manifest ?? {};
	let manifest = root;
	let tile = options.tile;
	let onPatch = options.onPatch;
	const crumbs = [root.title ?? root.id ?? "Widget"];
	for (const step of path) {
		const held = tile[step.hold] ?? {};
		const write = onPatch;
		manifest = options.registry.get(step.widget)?.manifest ?? { id: step.widget };
		tile = heldTile(tile, step.hold, heldKey(held, step.key, step.was), step.widget);
		onPatch = (patch) => write({ [step.hold]: rekey(held, step.key, step.was, { widget: step.widget, ...patch }) });
		crumbs.push(manifest.title ?? manifest.id);
	}
	return { manifest, tile, onPatch, crumbs };
}

function startingDraft(key, here, place) {
	const [kind, name] = String(key).split(":");
	if (kind === "where") return "";
	if (kind === "prop") {
		const spec = here.manifest.props?.[name];
		const config = here.tile.props?.[name] ?? {};
		if (bindingOf(spec, config).binding === "hardcode") {
			const held = typedIn(spec, config) ?? declaredOf(spec);
			if (held === undefined) return "";
			return writtenText(spec, held);
		}
		return config.path ?? "";
	}
	if (kind === "size") return String(name === "w" ? place.w : place.h);
	return "";
}

function boardOptions(options, path) {
	const { place, host, registry, columns, onDone, onDismiss, onResize, onCollapse, onExpand, countReaders, refs } =
		options;
	return {
		place,
		host,
		registry,
		columns,
		onDone,
		onDismiss,
		onResize,
		onCollapse,
		onExpand,
		countReaders,
		refs,
		surface: path.length > 0 ? null : options.surface,
	};
}

function viewState(look, here, place) {
	const { put } = look;
	const { tab, zoom, folded, narrow, sheetFull, openRow, draft } = look.view;
	return {
		tab,
		setTab: (next) => put({ tab: next }),
		zoom,
		setZoom: (next) => put({ zoom: next }),
		setPan: (next) => put({ pan: next }),
		setLook: (patch) => put(patch),
		folded,
		setFolded: (next) => put({ folded: next }),
		narrow,
		setNarrow: (next) => put({ narrow: next }),
		sheetFull,
		setSheetFull: (next) => put({ sheetFull: next }),
		openRow,
		openEditor: (next, seed) => put({ openRow: next, draft: next ? (seed ?? startingDraft(next, here, place)) : "" }),
		draft,
		setDraft: (next) => put({ draft: next }),
	};
}

function chromeState(look, frame, phone) {
	const { sheetHeight, setSheetHeight } = look;
	const { folded } = look.view;
	return {
		panelStyle: panelStyleOf(folded, phone),
		barStyle: phone && !folded ? { bottom: `${barPlacement(CHROME, sheetHeight, frame.height).bottomPx}px` } : null,
		barHidden: phone && barPlacement(CHROME, sheetHeight, frame.height).hidden,
		sheetHeight,
		setSheetHeight,
		sheetMaxPx: Math.max(CHROME.sheetPeekPx, frame.height - 2 * CHROME.padPx - CHROME.headerHeightPx - CHROME.gapPx),
	};
}

function panelStyleOf(folded, phone) {
	if (folded)
		return {
			right: `${CHROME.padPx}px`,
			top: `${CHROME.padPx}px`,
			width: `${CHROME.foldedPanelPx}px`,
			height: `${CHROME.foldedPanelPx}px`,
		};
	if (phone)
		return {
			left: `${CHROME.padPx}px`,
			right: `${CHROME.padPx}px`,
			bottom: `${CHROME.padPx}px`,
		};
	return {
		right: `${CHROME.padPx}px`,
		top: `${CHROME.padPx}px`,
		bottom: `${CHROME.padPx}px`,
		width: `${CHROME.panelWidthPx}px`,
	};
}
