import { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "./gateway/create";
import { defineManifest, defineProp, migration, verb } from "./gateway/manifest";
import { fieldOf, textOf } from "./gateway/match";
import { narrowed, normalizeWhere } from "./gateway/narrow";
import { pickedValue } from "./gateway/refs.js";
import { applyTabStep, archivedOf, movesRows, movesSelection, rowNamed, tabsOf } from "./tab-rows.js";
import { BACKGROUND, ROUNDED } from "./widget-root.js";

export { gatewayCache, stableKey } from "./gateway/cache";
export { soloGateway } from "./gateway/create";
export { narrowed } from "./gateway/narrow";
export { EMOJI_TABLE, EMOJI_VIEW_BOX } from "@widgetarium/kit/emoji-table";
export { ICON_TABLE, ICON_VIEW_BOX, ICON_WORDS } from "@widgetarium/kit/icons";

export const coreSurface = {
	defineManifest,
	defineProp,
	verb,
	migration,
	action,
	arrayGateway,
	collectionGateway,
	soloGateway,
	valueGateway,
	canDo,
	fieldOf,
	textOf,
	narrowed,
	normalizeWhere,
	pickedValue,
	applyTabStep,
	archivedOf,
	movesRows,
	movesSelection,
	rowNamed,
	tabsOf,
	ROUNDED,
	BACKGROUND,
};
