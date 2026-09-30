import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { heldKey, heldTile, rekey } from "../model.js";
import type { SlotRecord, Tile, TileMounts, TileProps, TileSettings } from "../model.js";
import { bindingOf, declaredOf, typedIn } from "../gateway/props.js";
import type { PropDefault } from "../gateway/props.js";
import type { SortRow, FilterRow } from "../gateway/contract.js";
import type { GatewayRefs } from "../gateway/refs.js";
import { seenOf } from "../prop-visibility.js";
import type { Seen, SeenSpec } from "../prop-visibility.js";
import { barPlacement, CHROME } from "../settings-fit.js";
import type { DialogFrame, OpeningScale, Point } from "../settings-fit.js";
import { writtenText } from "./prop-writing.js";
import type { TileSurface } from "./surface-group.js";
import type { BoxValues } from "./use-box-values.js";
import type { LookPatch, MountStep, SettingsLook, SettingsTab } from "./use-settings-look.js";
import type { DescribingHost, VaultFields } from "./use-vault-fields.js";
import type { VaultFilesHost } from "./vault-paths.js";
import type { GeometryManifest, GeometryOptions, Place, WindowGeometry } from "./window-geometry.js";

export interface ChoiceOption {
	readonly value: string;
	readonly label: string;
}

export interface SettingsDefault extends PropDefault {
	readonly path?: unknown;
}

export interface PropSource {
	readonly implementation?: unknown;
	readonly fields?: unknown;
}

export interface SettingsSpec extends SeenSpec {
	readonly type?: string | undefined;
	readonly label?: string | undefined;
	readonly hint?: string | undefined;
	readonly design?: boolean | undefined;
	readonly options?: readonly ChoiceOption[] | undefined;
	readonly sort?: readonly SortRow[] | undefined;
	readonly where?: readonly FilterRow[] | undefined;
	readonly default?: SettingsDefault | null;
	readonly source?: PropSource | undefined;
}

export interface SettingsManifest extends GeometryManifest {
	readonly props?: Readonly<Record<string, SettingsSpec>> | null;
}

export interface TilePatch {
	readonly widget?: string;
	readonly props?: TileProps;
	readonly surface?: string | undefined;
	readonly settings?: TileSettings;
	readonly mounts?: TileMounts;
	readonly slots?: Readonly<Record<string, TilePatch>>;
	readonly mounted?: Readonly<Record<string, TilePatch>>;
}

export interface SettingsHost extends DescribingHost, VaultFilesHost {
	readonly propertiesOf?: (path: string) => readonly string[] | null | undefined;
	readonly ui?: { readonly notify?: (said: string) => void } | null | undefined;
}

export interface SettingsRegistry {
	get(id: string): { readonly manifest?: SettingsManifest | null | undefined } | null | undefined;
}

export interface SettingsWindowOptions extends GeometryOptions {
	readonly definition?: { readonly manifest?: SettingsManifest | null | undefined } | null | undefined;
	readonly tile: Tile;
	readonly onPatch: (patch: TilePatch) => void;
	readonly registry: SettingsRegistry;
	readonly host?: SettingsHost | null | undefined;
	readonly refs?: GatewayRefs | null | undefined;
	readonly surface?: TileSurface | null | undefined;
	readonly columns: number;
	readonly countReaders: (path: string) => number;
	readonly onDone: () => void;
	readonly onDismiss: () => void;
	readonly onResize?: ((size: Partial<Place>) => void) | undefined;
	readonly onCollapse?: (() => void) | undefined;
	readonly onExpand?: (() => void) | undefined;
}

export interface SettingsContext {
	readonly manifest: SettingsManifest;
	readonly tile: Tile;
	readonly onPatch: (patch: TilePatch) => void;
	readonly crumbs: readonly string[];
}

export interface TabChoice {
	readonly value: SettingsTab;
	readonly label: string;
}

export interface SettingsStateAsk {
	readonly options: SettingsWindowOptions;
	readonly look: SettingsLook;
	readonly here: SettingsContext;
	readonly geometry: WindowGeometry;
	readonly vaultFields: VaultFields;
	readonly boxValues: BoxValues;
}

interface BoardOptions {
	readonly place: Place;
	readonly host: SettingsHost | null | undefined;
	readonly registry: SettingsRegistry;
	readonly columns: number;
	readonly onDone: () => void;
	readonly onDismiss: () => void;
	readonly onResize: ((size: Partial<Place>) => void) | undefined;
	readonly onCollapse: (() => void) | undefined;
	readonly onExpand: (() => void) | undefined;
	readonly countReaders: (path: string) => number;
	readonly refs: GatewayRefs | null | undefined;
	readonly surface: TileSurface | null | undefined;
}

interface ViewState {
	readonly tab: SettingsTab;
	readonly setTab: (next: SettingsTab) => void;
	readonly zoom: number | null;
	readonly setZoom: (next: number) => void;
	readonly setPan: (next: Point) => void;
	readonly setLook: (patch: LookPatch) => void;
	readonly folded: boolean;
	readonly setFolded: (next: boolean) => void;
	readonly narrow: boolean;
	readonly setNarrow: (next: boolean) => void;
	readonly sheetFull: boolean;
	readonly setSheetFull: (next: boolean) => void;
	readonly openRow: string | null;
	readonly openEditor: (next: string | null, seed?: string) => void;
	readonly draft: string;
	readonly setDraft: (next: string) => void;
}

interface ChromeState {
	readonly panelStyle: CSSProperties;
	readonly barStyle: CSSProperties | null;
	readonly barHidden: boolean;
	readonly sheetHeight: number;
	readonly setSheetHeight: Dispatch<SetStateAction<number>>;
	readonly sheetMaxPx: number;
}

export interface SettingsState extends BoardOptions, ViewState, ChromeState {
	readonly manifest: SettingsManifest;
	readonly tile: Tile;
	readonly seen: Seen;
	readonly onPatch: (patch: TilePatch) => void;
	readonly crumbs: readonly string[];
	readonly fed: readonly string[];
	readonly tabs: readonly TabChoice[];
	readonly isMount: boolean;
	readonly enter: (step: MountStep) => void;
	readonly popTo: (depth: number) => void;
	readonly vaultFields: VaultFields;
	readonly boxValues: BoxValues;
	readonly scale: number;
	readonly live: boolean;
	readonly opening: OpeningScale;
	readonly at: Point;
	readonly canNarrow: boolean;
	readonly phone: boolean;
	readonly isCollapsed: boolean;
}

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
	if (bindingOf(spec, config).binding !== "hardcode") return config.path ? String(config.path) : "";
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
