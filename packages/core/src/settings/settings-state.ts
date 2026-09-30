import type { CSSProperties } from "react";
import { heldKey, heldTile, rekey } from "../model.js";
import type { SlotRecord } from "../model.js";
import { bindingOf, declaredOf, typedIn } from "../gateway/props.js";
import { seenOf } from "../prop-visibility.js";
import { barPlacement, CHROME } from "../settings-fit.js";
import type { DialogFrame } from "../settings-fit.js";
import { writtenText } from "./prop-writing.js";
import { boundPath } from "./vault-paths.js";
import type { MountStep, SettingsLook } from "./use-settings-look.js";
import type { Place } from "./window-geometry.js";
import type {
	BoardOptions,
	ChromeState,
	SettingsContext,
	SettingsManifest,
	SettingsState,
	SettingsStateAsk,
	SettingsWindowOptions,
	TabChoice,
	TilePatch,
	ViewState,
} from "./settings-types.js";

export type {
	ChoiceOption,
	PropSource,
	SettingsContext,
	SettingsDefault,
	SettingsHost,
	SettingsManifest,
	SettingsRegistry,
	SettingsSpec,
	SettingsState,
	SettingsStateAsk,
	SettingsWindowOptions,
	TabChoice,
	TilePatch,
} from "./settings-types.js";

const TABS: readonly TabChoice[] = [
	{ value: "settings", label: "Settings" },
	{ value: "data", label: "Data" },
	{ value: "design", label: "Design" },
];

export function settingsState({
	options,
	look,
	here,
	geometry,
	vaultFields,
	boxValues,
}: SettingsStateAsk): SettingsState {
	const { path } = look.view;
	return {
		manifest: here.manifest,
		tile: here.tile,
		seen: seenOf(here.manifest, here.tile),
		onPatch: here.onPatch,
		crumbs: here.crumbs,
		fed: path[path.length - 1]?.fed ?? [],
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

export function contextAt(options: SettingsWindowOptions, path: readonly MountStep[]): SettingsContext {
	const root = options.definition?.manifest ?? {};
	let manifest: SettingsManifest = root;
	let tile = options.tile;
	let onPatch = options.onPatch;
	const crumbs = [root.title ?? root.id ?? "Widget"];
	for (const step of path) {
		const held: Readonly<Record<string, SlotRecord>> = tile[step.hold] ?? {};
		const write = onPatch;
		manifest = options.registry.get(step.widget)?.manifest ?? { id: step.widget };
		tile = heldTile(tile, step.hold, heldKey(held, step.key, step.was), step.widget);
		onPatch = (patch) =>
			write({ [step.hold]: rekey<TilePatch>(held, step.key, step.was, { widget: step.widget, ...patch }) });
		crumbs.push(manifest.title ?? manifest.id ?? "");
	}
	return { manifest, tile, onPatch, crumbs };
}

function startingDraft(key: string, here: SettingsContext, place: Place): string {
	const [kind, name = ""] = String(key).split(":");
	if (kind === "prop") return startingPropDraft(here, name);
	if (kind === "size") return String(name === "w" ? place.w : place.h);
	return "";
}

function startingPropDraft(here: SettingsContext, name: string): string {
	const spec = here.manifest.props?.[name];
	const config = here.tile.props?.[name] ?? {};
	if (bindingOf(spec, config).binding !== "hardcode") return boundPath(config);
	const held = typedIn(spec, config) ?? declaredOf(spec);
	if (held === undefined || !spec) return "";
	return writtenText(spec, held);
}

function boardOptions(options: SettingsWindowOptions, path: readonly MountStep[]): BoardOptions {
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

function viewState(look: SettingsLook, here: SettingsContext, place: Place): ViewState {
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

function chromeState(look: SettingsLook, frame: DialogFrame, phone: boolean): ChromeState {
	const { sheetHeight, setSheetHeight } = look;
	const { folded } = look.view;
	const bar = barPlacement(CHROME, sheetHeight, frame.height);
	return {
		panelStyle: panelStyleOf(folded, phone),
		barStyle: phone && !folded ? { bottom: `${bar.bottomPx}px` } : null,
		barHidden: phone && bar.hidden,
		sheetHeight,
		setSheetHeight,
		sheetMaxPx: Math.max(CHROME.sheetPeekPx, frame.height - 2 * CHROME.padPx - CHROME.headerHeightPx - CHROME.gapPx),
	};
}

function panelStyleOf(folded: boolean, phone: boolean): CSSProperties {
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
