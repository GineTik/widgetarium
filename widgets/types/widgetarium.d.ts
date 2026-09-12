export type {
	Action,
	CanResult,
	CollectionGateway,
	CollectionOps,
	DuplicateIdReport,
	FilterRow,
	GatewayEvent,
	GatewayRef,
	Patch,
	PrimitiveType,
	PropKind,
	PropSpec,
	PropSpecs,
	Query,
	Ref,
	Row,
	RowsResult,
	SortRow,
	Unsubscribe,
	ValueGateway,
	ValueOps,
	VerbNeed,
} from "../../src/gateway/contract";

export type {
	Aka,
	Color,
	CreateAction,
	Day,
	DefaultVerbs,
	GetAction,
	ListAction,
	RemoveAction,
	Text,
	UpdateAction,
	VaultRecord,
} from "../../src/gateway/needs";

export type { DataState } from "../../src/gateway/use-data";
export { flatRows, useData } from "../../src/gateway/use-data";
export { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "../../src/gateway/create";
export { fieldOf, textOf } from "../../src/gateway/match";
export { narrowed, normalizeWhere } from "../../src/gateway/narrow";
export { useNarrowed } from "../../src/gateway/use-narrowed";
export { useValue } from "../../src/gateway/use-value";

import type { ReactNode } from "react";
import type { DeclaredPropSpecs } from "../../src/gateway/contract";
import type { VaultRecord } from "../../src/gateway/needs";

export interface HostConsole {
	can: { log: boolean; run: boolean };
	log(...parts: unknown[]): boolean;
	run(command: string): Promise<{ ok: boolean; output: string; failure: string | null }>;
}

export interface ViewHost {
	platform: string;
	type: string;
	can: { catalogue: boolean; fullscreen: boolean; subscribe: boolean; network: boolean; renderMarkdown: boolean };
	console: HostConsole;
	ui: {
		notify(said: string): void;
		renderMarkdown(element: HTMLElement, markdown: string, sourcePath?: string): () => void;
	};
}

export interface Navigation {
	canNavigate: boolean;
	resolve(link: string): string | null;
	navigate(link: string): boolean;
}

export interface ReadAnswer {
	ok: boolean;
	text: string;
	path: string | null;
	bytes: number;
	failure: string | null;
}

export interface PassageReader {
	canRead: boolean;
	read(link: string, options?: { maxBytes?: number }): Promise<ReadAnswer>;
}

export interface PassageRecord {
	of: string;
	path: string;
	props: Record<string, unknown>;
	content: string | null;
}

export interface Here<T = VaultRecord> {
	of: string;
	content: string | null;
	canUpdate: boolean;
	get(): Promise<T | null>;
	update(content: string): Promise<boolean>;
}

export interface InlineContent {
	content: string | null;
}

export interface MountRow {
	name: string;
	widget?: string;
	hidden?: boolean;
	was?: string;
}

export type Release = () => void;

export interface MountEntry {
	name: string;
	id?: string;
	hidden: boolean;
	title: string;
	manifest: Record<string, unknown> | null;
	problem: "failed" | "not-found" | "empty" | null;
	failure: string | null;
	drawInto: ((element: HTMLElement) => Release) | null;
}

export type ConfigureMounts = (name: string, rows: MountRow[]) => void;

export interface WidgetCatalogue {
	canOpen: boolean;
	open(options?: { mode?: string; kind?: string }): Promise<string | null>;
}

export type FoldIntoGroup = () => boolean;

export type Slot<Given> = ((given: Given) => ReactNode) | null;

export interface WidgetMeta {
	id?: string;
	title?: string;
	inline?: boolean;
	props?: DeclaredPropSpecs;
}

export declare function createWidget<Props>(component: (props: Props) => any, meta?: WidgetMeta): (props: Props) => any;

// TODO: type the React surface of the api module — these are widget-facing components, not gateways
export declare const Dialog: any;
export declare const DialogOverlay: any;
export declare const DialogContent: any;
export declare const DialogHeader: any;
export declare const DialogTitle: any;
export declare const DialogDescription: any;
export declare const DialogFooter: any;
export declare const DialogClose: any;
export declare const ConfirmDialog: any;
export declare const Mounted: (props: { entry: MountEntry }) => ReactNode;
export declare const WidgetRoot: any;
export declare const AppearanceOverride: any;
export declare const useWidgetRounded: any;
export declare const useBackgroundType: any;
export declare const ROUNDED: any;
export declare const BACKGROUND: any;
export declare const useAction: any;
export declare const pickedValue: any;
export declare const EditableTabs: any;
export declare const toTabList: any;
export declare const applyTabStep: any;
export declare const archivedOf: any;
export declare const movesRows: any;
export declare const movesSelection: any;
export declare const rowNamed: any;
export declare const tabsOf: any;
export declare const Kit: any;
