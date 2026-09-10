import {
	Dialog,
	DialogOverlay,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
} from "./dialog.js";
import { useAction } from "./action.js";
import { EditableTabs, toTabList } from "./editable-tabs.js";
import { applyTabStep, archivedOf, movesRows, movesSelection, rowNamed, tabsOf } from "./tab-rows.js";
import { WidgetRoot, AppearanceOverride, useWidgetRounded, useBackgroundType, ROUNDED, BACKGROUND } from "./widget-root.js";
import { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "./gateway/create";
import { fieldOf, textOf } from "./gateway/match";
import { flatRows, useData } from "./gateway/use-data";
import { narrowed, normalizeWhere } from "./gateway/narrow";
import { pickedValue } from "./gateway/refs.js";
import { useNarrowed } from "./gateway/use-narrowed";
import { useValue } from "./gateway/use-value";
import * as kitModule from "./kit.js";
import * as emojiModule from "./emojis.js";

const { Kit } = kitModule;

// the seam where the host will later wrap the view (provider, error boundary, settings shell);
// for now it only carries optional metadata for widgets used outside a vault
function createWidget(component, meta) {
	if (meta) component.meta = meta;
	return component;
}

const core = {
	Dialog,
	DialogOverlay,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
	WidgetRoot,
	AppearanceOverride,
	useWidgetRounded,
	useBackgroundType,
	ROUNDED,
	BACKGROUND,
	useAction,
	createWidget,
	action,
	arrayGateway,
	canDo,
	fieldOf,
	textOf,
	collectionGateway,
	soloGateway,
	valueGateway,
	useData,
	flatRows,
	narrowed,
	normalizeWhere,
	pickedValue,
	useNarrowed,
	useValue,
	EditableTabs,
	toTabList,
	applyTabStep,
	archivedOf,
	movesRows,
	movesSelection,
	rowNamed,
	tabsOf,
};

// TRADE-OFF: the kit stays OUT of the core surface and is reached by its own specifier —
// "widgetarium" is what a widget must have, "widgetarium/kit" is what it may take. `Kit` is
// kept for <Kit.Button/> in JSX, where a capital is what marks a component.
export { kitModule, emojiModule };
export const widgetarium = { ...core, Kit };
