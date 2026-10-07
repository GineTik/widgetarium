import { useId, useRef } from "react";
import type { RefObject } from "react";
import type { FocusIntent, MenuFamily, MenuState } from "../components/menu-context";
import { isInMenuTree } from "../components/menu-context";
import type { AnchorBox } from "../constants/popover";
import { boxOf } from "../utils/floating-placement";
import { useControllableState } from "./use-controllable-state";

export interface MenuRootAsk {
	readonly family: MenuFamily;
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly anchorBox?: (() => AnchorBox | null) | undefined;
	readonly focusIntent?: RefObject<FocusIntent> | undefined;
	readonly isAlsoInside?: ((node: Node) => boolean) | undefined;
}

export function useMenuRoot(ask: MenuRootAsk): MenuState {
	const [isOpen, setOpen] = useControllableState({
		prop: ask.open,
		defaultProp: ask.defaultOpen ?? false,
		onChange: ask.onOpenChange,
	});
	const triggerRef = useRef<HTMLElement>(null);
	const ownIntent = useRef<FocusIntent>("panel");
	const childCloser = useRef<(() => void) | null>(null);
	const treeId = useId();
	const contentId = useId();
	return {
		family: ask.family,
		isOpen,
		setOpen,
		closeTree: () => {
			childCloser.current?.();
			setOpen(false);
		},
		treeId,
		contentId,
		triggerRef,
		anchorBox: ask.anchorBox ?? boxOf(triggerRef),
		focusIntent: ask.focusIntent ?? ownIntent,
		childCloser,
		isInside: (node) =>
			isInMenuTree(node, treeId) || Boolean(triggerRef.current?.contains(node)) || Boolean(ask.isAlsoInside?.(node)),
		parent: null,
	};
}
