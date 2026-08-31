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
import { archivedColumnsFor, boardWriter, boardsToCreate, readBoardRecord } from "./board-record.js";
import { WidgetRoot, AppearanceOverride, useWidgetRounded, useBackgroundType, ROUNDED, BACKGROUND } from "./widget-root.js";
import * as kitModule from "./kit.js";

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
	EditableTabs,
	toTabList,
	readBoardRecord,
	boardWriter,
	boardsToCreate,
	archivedColumnsFor,
};

// TRADE-OFF: the kit stays OUT of the core surface and is reached by its own specifier —
// "widgetarium" is what a widget must have, "widgetarium/kit" is what it may take. `Kit` is
// kept for <Kit.Button/> in JSX, where a capital is what marks a component.
export { kitModule };
export const widgetarium = { ...core, Kit };
