import { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "./gateway/create";
import {
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
	z,
} from "./gateway/declared";
import { defineGatewayMetadata } from "./gateway/implementation-metadata";
import { ICommand, IQuery } from "./gateway/queries";
import { PageInputSchema, PageOf } from "./gateway/page";
import { defineDefaultImplementation, RowsInMemoryGateway, ValueInMemoryGateway } from "./gateway/defaults";
import { fieldOf, textOf } from "./gateway/match";
import { narrow, normalizeWhere } from "./gateway/narrow";
import { pickedValue } from "./gateway/refs.js";
import { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "./tab-rows.js";

export { gatewayCache, stableKey } from "./gateway/cache";
export { canOf, collectionGateway, metaOf, rowOf, soloGateway, toRows, valueGateway } from "./gateway/create";
export { narrow } from "./gateway/narrow";
export { EMOJI_TABLE, EMOJI_VIEW_BOX } from "@widgetarium/kit/emoji-table";
export { extendTailwindMerge } from "tailwind-merge";
export { ICON_TABLE, ICON_VIEW_BOX, ICON_WORDS } from "@widgetarium/kit/icons";

export const coreSurface = {
	IBaseGateway,
	ICatalogue,
	ICarrier,
	ICommand,
	IQuery,
	PageInputSchema,
	PageOf,
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
	z,
	defineLayout,
	defineGatewayMetadata,
	defineDefaultImplementation,
	RowsInMemoryGateway,
	ValueInMemoryGateway,
	defineMetadata,
	defineMigrations,
	defineStates,
	action,
	arrayGateway,
	collectionGateway,
	soloGateway,
	valueGateway,
	canDo,
	fieldOf,
	textOf,
	narrow,
	normalizeWhere,
	pickedValue,
	applyTabStep,
	archivedOf,
	movesRows,
	movesSelection,
	tabsOf,
};
