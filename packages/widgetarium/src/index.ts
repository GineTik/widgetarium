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
} from "@widgetarium/core/gateway/contract.js";

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
} from "@widgetarium/core/gateway/needs.js";

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
} from "@widgetarium/core/gateway/manifest.js";

export type {
	DeclaredProps,
	DrawnProps,
	PropsOf,
	GivenProps,
	Implementation,
	WidgetLayout,
	MigrationStep,
	RecordRef,
	VaultRecord,
	TileProp,
	WidgetMetadata,
	WidgetProp,
} from "@widgetarium/core/gateway/declared.js";
export type { ManyResult, Upsert } from "@widgetarium/core/gateway/many.js";
export type { GatewayContext, Problem, ProblemIssue } from "@widgetarium/core/gateway/problems.js";
export type { GatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
export { defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
export {
	defineDefaultImplementation,
	RowsInMemoryGateway,
	ValueInMemoryGateway,
} from "@widgetarium/core/gateway/defaults.js";
export type { RowsFields, ValueFields } from "@widgetarium/core/gateway/defaults.js";
export {
	IBaseGateway,
	ICatalogue,
	ICarrier,
	IConfigureMounts,
	IContent,
	ICrudGateway,
	IFoldIntoGroup,
	IHere,
	IHost,
	IListGateway,
	IRepeat,
	INavigator,
	IPreview,
	IReader,
	RecordRefSchema,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	defineLayout,
	defineMetadata,
	defineMigrations,
	defineStates,
} from "@widgetarium/core/gateway/declared.js";
// TODO: remove z re-export once no widget imports it
export { z } from "@widgetarium/core/gateway/declared.js";

export type { DataState, Listed, PageState } from "@widgetarium/core/gateway/use-data.js";
export type { Page, PageInput } from "@widgetarium/core/gateway/page.js";
export { PageInputSchema, PageOf } from "@widgetarium/core/gateway/page.js";
export type { HandlerContext, HandlerUser } from "@widgetarium/core/gateway/handler-context.js";
export { useData } from "@widgetarium/core/gateway/use-data.js";
export {
	action,
	arrayGateway,
	canDo,
	collectionGateway,
	soloGateway,
	valueGateway,
} from "@widgetarium/core/gateway/create.js";
export { fieldOf, textOf } from "@widgetarium/core/gateway/match.js";
export { narrow, normalizeWhere } from "@widgetarium/core/gateway/narrow.js";
export { useNarrowed } from "@widgetarium/core/gateway/use-narrowed.js";
export { useValue } from "@widgetarium/core/gateway/use-value.js";
export { pickedValue } from "@widgetarium/core/gateway/picked-value.js";
export type { SlotComponent, SlotList } from "@widgetarium/core/slot-components.js";

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
	WidgetPreview,
	Carrier,
	CarriedWidget,
	PlaceAt,
	CarryPointer,
} from "@widgetarium/core/gateway/host.js";

export type { CreatedWidget, WidgetToCreate } from "@widgetarium/core/widget-api.js";
export { createWidget } from "@widgetarium/core/widget-api.js";
export type { DialogProps } from "@widgetarium/core/dialog.js";
export {
	ConfirmDialog,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@widgetarium/core/dialog.js";
export type { ConfirmDialogProps } from "@widgetarium/core/confirm-dialog.js";
export type { DialogPartProps } from "@widgetarium/core/dialog-parts.js";
export type { EditableTabsProps } from "@widgetarium/core/editable-tabs.js";
export { EditableTabs } from "@widgetarium/core/editable-tabs.js";
export type { TabRow, TabStep, TabVerb } from "@widgetarium/core/tab-rows.js";
export { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "@widgetarium/core/tab-rows.js";
export type { MountedProps } from "@widgetarium/core/mounted.js";
export { Mounted } from "@widgetarium/core/mounted.js";
export type { WidgetRootProps } from "@widgetarium/core/widget-root.js";
export { WidgetRoot } from "@widgetarium/core/widget-root.js";
export type { CommandAnswer } from "@widgetarium/core/gateway/run-handler.js";
export { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
