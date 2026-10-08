import { useId, useRef } from "react";
import type { RefObject } from "react";
import type { FocusIntent, MenuFamily, MenuState } from "../components/menu-context";
import { isInMenuTree } from "../components/menu-context";
import type { AnchorBox } from "../constants/popover";
import { boxOf } from "../utils/floating-placement";
import { useMenuChildren } from "./use-menu-children";
import { useOpenState } from "./use-open-state";
import type { OpenAsk } from "./use-open-state";

export interface MenuRootAsk extends OpenAsk {
	readonly family: MenuFamily;
	readonly anchorBox?: (() => AnchorBox | null) | undefined;
	readonly focusIntent?: RefObject<FocusIntent> | undefined;
	readonly isAlsoInside?: ((node: Node) => boolean) | undefined;
}

export function useMenuRoot(ask: MenuRootAsk): MenuState {
	const [isOpen, setOpen] = useOpenState(ask);
	const { openChild, closeChildren } = useMenuChildren(isOpen);
	const triggerRef = useRef<HTMLElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const ownIntent = useRef<FocusIntent>("panel");
	const treeId = useId();
	const contentId = useId();
	return {
		family: ask.family,
		isOpen,
		setOpen,
		closeTree: () => {
			closeChildren();
			setOpen(false);
		},
		openChild,
		closeChildren,
		treeId,
		contentId,
		triggerRef,
		panelRef,
		anchorBox: ask.anchorBox ?? boxOf(triggerRef),
		focusIntent: ask.focusIntent ?? ownIntent,
		isInside: (node) =>
			isInMenuTree(node, treeId) || Boolean(triggerRef.current?.contains(node)) || Boolean(ask.isAlsoInside?.(node)),
		parent: null,
	};
}
