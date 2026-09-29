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
export { narrow, normalizeWhere } from "../../core/src/gateway/narrow";
export { useNarrowed } from "../../core/src/gateway/use-narrowed";
export { useValue } from "../../core/src/gateway/use-value";
export { pickedValue } from "../../core/src/gateway/picked";

import type { HTMLAttributes, ReactNode } from "react";
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
	readonly draw: (drawn: DrawnProps<P>) => ReactNode;
}): ((given: GivenProps<P>) => ReactNode) & { readonly declared: P };

export declare function Dialog(props: {
	readonly isOpen?: boolean;
	readonly onOpenChange?: (isOpen: boolean) => unknown;
	readonly onClose?: () => unknown;
	readonly trigger?: ReactNode;
	readonly className?: string;
	readonly children?: ReactNode;
}): ReactNode;
export declare function DialogContent(props: {
	readonly className?: string;
	readonly width?: string;
	readonly children?: ReactNode;
}): ReactNode;
export declare function DialogClose(props: {
	readonly className?: string;
	readonly onClose?: () => unknown;
	readonly label?: string;
}): ReactNode;
type DialogPartProps = HTMLAttributes<HTMLElement> & { readonly children?: ReactNode };
export declare function DialogHeader(props: DialogPartProps): ReactNode;
export declare function DialogTitle(props: DialogPartProps): ReactNode;
export declare function DialogDescription(props: DialogPartProps): ReactNode;
export declare function DialogFooter(props: DialogPartProps): ReactNode;
export declare function ConfirmDialog(props: {
	readonly isOpen?: boolean;
	readonly title: ReactNode;
	readonly description: ReactNode;
	readonly confirmLabel: ReactNode;
	readonly variant?: "danger" | "accent";
	readonly onConfirm: () => unknown;
	readonly onOpenChange?: (isOpen: boolean) => unknown;
	readonly className?: string;
}): ReactNode;

export type TabStep = {
	readonly verb: "add" | "rename" | "archive" | "restore" | "delete" | "select";
	readonly tabs: readonly string[];
	readonly archived: readonly string[];
	readonly selected: string;
	readonly name: string;
	readonly was: string | null;
};
export type TabRow = { readonly name: string; readonly hidden?: boolean; readonly was?: string };
export declare function EditableTabs(props: {
	readonly tabs: readonly string[];
	readonly archived: readonly string[];
	readonly selected: string;
	readonly onChange?: (step: TabStep) => unknown;
	readonly onRefuse?: (said: string) => unknown;
	readonly deleteWarning?: string;
	readonly className?: string;
}): ReactNode;
export declare function tabsOf(rows: readonly TabRow[] | null | undefined): string[];
export declare function archivedOf(rows: readonly TabRow[] | null | undefined): string[];
export declare function applyTabStep<R extends TabRow>(
	rows: readonly R[] | null | undefined,
	step: TabStep,
): (R | TabRow)[];
export declare function movesRows(step: TabStep): boolean;
export declare function movesSelection(step: TabStep): boolean;

export declare function Mounted(props: { readonly entry: MountEntry }): ReactNode;
