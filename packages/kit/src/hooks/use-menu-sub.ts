import { useCallback, useId, useRef } from "react";
import type { FocusIntent, MenuState } from "../components/menu-context";
import { useMenu } from "../components/menu-context";
import { boxOf } from "../utils/floating-placement";
import { useMenuChildren } from "./use-menu-children";
import { useOpenState } from "./use-open-state";
import type { OpenAsk } from "./use-open-state";

export function useMenuSub(ask: OpenAsk): MenuState {
	const parent = useMenu();
	const [isOpen, setOpen] = useOpenState(ask);
	const { openChild, closeChildren } = useMenuChildren(isOpen);
	const triggerRef = useRef<HTMLElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const focusIntent = useRef<FocusIntent>("none");
	const contentId = useId();
	const closeSelf = useCallback(() => {
		closeChildren();
		setOpen(false);
	}, [closeChildren, setOpen]);
	return {
		family: parent.family,
		treeId: parent.treeId,
		closeTree: parent.closeTree,
		isInside: parent.isInside,
		isOpen,
		setOpen: (next) => {
			if (!next) {
				closeSelf();
				return;
			}
			parent.openChild(closeSelf);
			setOpen(true);
		},
		openChild,
		closeChildren,
		contentId,
		triggerRef,
		panelRef,
		anchorBox: boxOf(triggerRef),
		focusIntent,
		parent,
	};
}
