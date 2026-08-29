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
} from "../src/dialog.js";
export { useAction } from "../src/action.js";
export { Kit } from "../src/kit.js";

export function createWidget(component, meta) {
	if (meta) component.meta = meta;
	return component;
}
