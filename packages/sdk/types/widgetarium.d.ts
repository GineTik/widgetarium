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
	PropKind,
	Query,
	Row,
	RowsResult,
	SortRow,
	Unsubscribe,
	ValueOps,
} from "../../core/src/gateway/contract";

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
} from "../../core/src/gateway/needs";

export type {
	Choice,
	Control,
	CollectionGatewayOf,
	Describes,
	FieldDescription,
	HeldSpec,
	Manifest,
	ManifestCard,
	PropSeen,
	PropsSeen,
	PropSpec as ManifestProp,
	StandardVerb,
	ValueGatewayOf,
	Visibility,
	WidgetSize,
} from "../../core/src/gateway/manifest";

export type {
	DeclaredProps,
	DrawnProps,
	GivenProps,
	Implementation,
	WidgetLayout,
	MigrationStep,
	RecordRef,
	VaultRecord,
	TileProp,
	WidgetMetadata,
	WidgetProp,
} from "../../core/src/gateway/declared";
export type { ManyResult, Upsert } from "../../core/src/gateway/many";
export type { GatewayContext, Problem, ProblemIssue } from "../../core/src/gateway/problems";
export type { GatewayMetadata } from "../../core/src/gateway/implementation-metadata";
export { defineGatewayMetadata } from "../../core/src/gateway/implementation-metadata";
export {
	defineDefaultImplementation,
	RowsInMemoryGateway,
	ValueInMemoryGateway,
} from "../../core/src/gateway/defaults";
export type { RowsFields, ValueFields } from "../../core/src/gateway/defaults";
export {
	IBaseGateway,
	ICatalogue,
	IConfigureMounts,
	IContent,
	ICrudGateway,
	IFoldIntoGroup,
	IHere,
	IHost,
	IListGateway,
	IMounts,
	INavigator,
	IReader,
	RecordRefSchema,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	defineLayout,
	defineMetadata,
	defineMigrations,
	defineProps,
	z,
} from "../../core/src/gateway/declared";

export type { DataState, Listed } from "../../core/src/gateway/use-data";
export { useData } from "../../core/src/gateway/use-data";
export {
	action,
	arrayGateway,
	canDo,
	collectionGateway,
	soloGateway,
	valueGateway,
} from "../../core/src/gateway/create";
export { fieldOf, textOf } from "../../core/src/gateway/match";
export { narrowed, normalizeWhere } from "../../core/src/gateway/narrow";
export { useNarrowed } from "../../core/src/gateway/use-narrowed";
export { useValue } from "../../core/src/gateway/use-value";

import type { ReactNode } from "react";
import type { DeclaredProps, DrawnProps, GivenProps } from "../../core/src/gateway/declared";

export type {
	ConfigureMounts,
	FoldIntoGroup,
	Here,
	HostConsole,
	InlineContent,
	MountEntry,
	MountRow,
	Navigation,
	NavigationTarget,
	PassageReader,
	PassageRecord,
	ReadAnswer,
	Release,
	Slot,
	ViewHost,
	WidgetCatalogue,
} from "../../core/src/gateway/host";
import type { MountEntry } from "../../core/src/gateway/host";

export declare function createWidget<const P extends DeclaredProps = {}>(widget: {
	readonly inject?: P;
	readonly draw: (drawn: DrawnProps<P>) => any;
}): ((given: GivenProps<P>) => any) & { readonly declared: P };

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
