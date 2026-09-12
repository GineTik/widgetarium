import { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "./gateway/create";
import { fieldOf, textOf } from "./gateway/match";
import { flatRows } from "./gateway/use-data";
import { narrowed, normalizeWhere } from "./gateway/narrow";
import { pickedValue } from "./gateway/refs.js";
import { applyTabStep, archivedOf, movesRows, movesSelection, rowNamed, tabsOf } from "./tab-rows.js";
import { ROUNDED, BACKGROUND } from "./widget-root.js";

export { gatewayCache, stableKey } from "./gateway/cache";
export { soloGateway } from "./gateway/create";
export { narrowed } from "./gateway/narrow";
export { EMOJI_TABLE, EMOJI_VIEW_BOX } from "./emoji-table.js";

export const coreSurface = {
	action,
	arrayGateway,
	collectionGateway,
	soloGateway,
	valueGateway,
	canDo,
	fieldOf,
	textOf,
	flatRows,
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
