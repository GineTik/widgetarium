// CONTEXT: the two specifiers a widget may import, wired to the real sources
export {
	WidgetRoot,
	AppearanceOverride,
	useWidgetRounded,
	useBackgroundType,
	ROUNDED,
	BACKGROUND,
} from "../src/widget-root.js";
export {
	Dialog,
	DialogOverlay,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
} from "../src/dialog.js";
export { useAction } from "../src/action.js";
export { Kit } from "../src/kit.js";

export function createWidget(component, meta) {
	if (meta) component.meta = meta;
	return component;
}
export { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "../src/gateway/create";
export { fieldOf, textOf } from "../src/gateway/match";
export { useData } from "../src/gateway/use-data";
export { applyTabStep, archivedOf, movesRows, movesSelection, rowNamed, tabsOf } from "../src/tab-rows.js";
export { EditableTabs, toTabList } from "../src/editable-tabs.js";
export { flatRows } from "../src/gateway/use-data";
export { narrowed, normalizeWhere } from "../src/gateway/narrow";
export { pickedValue } from "../src/gateway/refs.js";
export { useNarrowed } from "../src/gateway/use-narrowed";
