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
} from "./gateway/contract.js";

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
} from "./gateway/needs.js";

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
} from "./gateway/manifest.js";

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
} from "./gateway/declared.js";
export type { ManyResult, Upsert } from "./gateway/many.js";
export type { GatewayContext, Problem, ProblemIssue } from "./gateway/problems.js";
export type { GatewayMetadata } from "./gateway/implementation-metadata.js";
export { defineGatewayMetadata } from "./gateway/implementation-metadata.js";
export { defineDefaultImplementation, RowsInMemoryGateway, ValueInMemoryGateway } from "./gateway/defaults.js";
export type { RowsFields, ValueFields } from "./gateway/defaults.js";
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
} from "./gateway/declared.js";
// TODO: remove z re-export once no widget imports it
export { z } from "./gateway/declared.js";

export type { DataState, Listed, PageState } from "./gateway/use-data.js";
export type { Page, PageInput } from "./gateway/page.js";
export { PageInputSchema, PageOf } from "./gateway/page.js";
export type { HandlerContext, HandlerUser } from "./gateway/handler-context.js";
export { useData } from "./gateway/use-data.js";
export { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "./gateway/create.js";
export { fieldOf, textOf } from "./gateway/match.js";
export { narrow, normalizeWhere } from "./gateway/narrow.js";
export { useNarrowed } from "./gateway/use-narrowed.js";
export { useValue } from "./gateway/use-value.js";
export { pickedValue } from "./gateway/picked-value.js";
export type { SlotComponent, SlotList } from "./slot-components.js";

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
} from "./gateway/host.js";

export type { CreatedWidget, WidgetToCreate } from "./widget-api.js";
export { createWidget } from "./widget-api.js";
export type { DialogProps } from "./dialog.js";
export {
	ConfirmDialog,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./dialog.js";
export type { ConfirmDialogProps } from "./confirm-dialog.js";
export type { DialogPartProps } from "./dialog-parts.js";
export type { EditableTabsProps } from "./editable-tabs.js";
export { EditableTabs } from "./editable-tabs.js";
export type { TabRow, TabStep, TabVerb } from "./tab-rows.js";
export { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "./tab-rows.js";
export type { MountedProps } from "./mounted.js";
export { Mounted } from "./mounted.js";
export type { WidgetRootProps } from "./widget-root.js";
export { WidgetRoot } from "./widget-root.js";
export type { CommandAnswer } from "./gateway/run-handler.js";
export { ICommand, IQuery } from "./gateway/queries.js";
