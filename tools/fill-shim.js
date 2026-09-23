// CONTEXT: the two specifiers a widget may import, wired to the real sources
export {
	AppearanceOverride,
	BACKGROUND,
	ROUNDED,
	useBackgroundType,
	useWidgetRounded,
	WidgetRoot,
} from "../packages/core/src/widget-root.js";
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
} from "../packages/core/src/dialog.js";
export { useAction } from "../packages/core/src/action.js";
export { Mounted } from "../packages/core/src/mounted.js";
export { Kit } from "../packages/kit/src/kit.js";

export function createWidget(first, second) {
	if (typeof first === "function") {
		if (second) first.meta = second;
		return first;
	}
	second.manifest = first;
	return second;
}
export { defineManifest, defineProp, migration, verb } from "../packages/core/src/gateway/manifest";
export { action, arrayGateway, canDo, collectionGateway, soloGateway, valueGateway } from "../packages/core/src/gateway/create";
export { fieldOf, textOf } from "../packages/core/src/gateway/match";
export { useData } from "../packages/core/src/gateway/use-data";
export { useValue } from "../packages/core/src/gateway/use-value";
export { applyTabStep, archivedOf, movesRows, movesSelection, rowNamed, tabsOf } from "../packages/core/src/tab-rows.js";
export { EditableTabs, toTabList } from "../packages/core/src/editable-tabs.js";
export { narrowed, normalizeWhere } from "../packages/core/src/gateway/narrow";
export { pickedValue } from "../packages/core/src/gateway/refs.js";
export { useNarrowed } from "../packages/core/src/gateway/use-narrowed";
