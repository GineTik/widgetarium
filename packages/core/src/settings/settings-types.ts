import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { Tile, TileMounts, TileProps, TileSettings } from "../model.js";
import type { PropDefault } from "../gateway/props.js";
import type { SortRow, FilterRow } from "../gateway/contract.js";
import type { GatewayRefs } from "../gateway/refs.js";
import type { Seen, SeenSpec } from "../prop-visibility.js";
import type { OpeningScale, Point } from "../settings-fit.js";
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
	readonly commands?: unknown;
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

export interface BoardOptions {
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

export interface ViewState {
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

export interface ChromeState {
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
