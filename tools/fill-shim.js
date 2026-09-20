// CONTEXT: the two specifiers a widget may import, wired to the real sources
export {
	AppearanceOverride,
	BACKGROUND,
	ROUNDED,
	useBackgroundType,
	useWidgetRounded,
	WidgetRoot,
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
export { Mounted } from "../src/mounted.js";
export { Kit } from "../src/kit.js";

export function createWidget(first, second) {
	if (typeof first === "function") {
		if (second) first.meta = second;
		return first;
	}
	second.manifest = first;
	return second;
}
export { defineManifest, defineProp, migration, verb } from "../src/gateway/manifest";
export { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "../src/gateway/create";
export { fieldOf, textOf } from "../src/gateway/match";
export { useData } from "../src/gateway/use-data";
export { useValue } from "../src/gateway/use-value";
export { applyTabStep, archivedOf, movesRows, movesSelection, rowNamed, tabsOf } from "../src/tab-rows.js";
export { EditableTabs, toTabList } from "../src/editable-tabs.js";
export { narrowed, normalizeWhere } from "../src/gateway/narrow";
export { pickedValue } from "../src/gateway/refs.js";
export { useNarrowed } from "../src/gateway/use-narrowed";
