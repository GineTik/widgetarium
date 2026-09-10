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
	Query,
	Ref,
	Row,
	RowsResult,
	SortRow,
	Unsubscribe,
	ValueGateway,
	ValueOps,
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

export interface WidgetMeta {
	id?: string;
	title?: string;
	inline?: boolean;
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
