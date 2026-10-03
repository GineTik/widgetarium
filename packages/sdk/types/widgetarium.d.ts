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
	ICarrier,
	IConfigureMounts,
	IContent,
	ICrudGateway,
	IFoldIntoGroup,
	IHere,
	IHost,
	IListGateway,
	IMounts,
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
export { narrow, normalizeWhere } from "../../core/src/gateway/narrow";
export { useNarrowed } from "../../core/src/gateway/use-narrowed";
export { useValue } from "../../core/src/gateway/use-value";
export { pickedValue } from "../../core/src/gateway/picked-value";

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
} from "../../core/src/gateway/host";

export type { CreatedWidget, WidgetToCreate } from "../../core/src/widget-api";
export { createWidget } from "../../core/src/widget-api";
export type { DialogProps } from "../../core/src/dialog";
export {
	ConfirmDialog,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../core/src/dialog";
export type { ConfirmDialogProps } from "../../core/src/confirm-dialog";
export type { DialogPartProps } from "../../core/src/dialog-parts";
export type { EditableTabsProps } from "../../core/src/editable-tabs";
export { EditableTabs } from "../../core/src/editable-tabs";
export type { TabRow, TabStep, TabVerb } from "../../core/src/tab-rows";
export { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "../../core/src/tab-rows";
export type { MountedProps } from "../../core/src/mounted";
export { Mounted } from "../../core/src/mounted";
export type { WidgetRootProps } from "../../core/src/widget-root";
export { WidgetRoot } from "../../core/src/widget-root";
export type { CommandAnswer } from "../../core/src/gateway/queries";
export { ICommand, IQuery } from "../../core/src/gateway/queries";
