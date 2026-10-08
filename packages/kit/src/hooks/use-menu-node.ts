import { useCallback } from "react";
import { useMenuChildren } from "./use-menu-children";
import type { MenuChildren } from "./use-menu-children";
import { useMenuRefs } from "./use-menu-refs";
import type { MenuRefs } from "./use-menu-refs";
import { useOpenState } from "./use-open-state";
import type { OpenAsk } from "./use-open-state";

export interface MenuNode extends MenuChildren, MenuRefs {
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly closeSelf: () => void;
}

export function useMenuNode(ask: OpenAsk): MenuNode {
	const [isOpen, setOpen] = useOpenState(ask);
	const children = useMenuChildren(isOpen);
	const closeSelf = useCallback(() => {
		children.closeChildren();
		setOpen(false);
	}, [children, setOpen]);
	return { ...children, isOpen, setOpen, closeSelf, ...useMenuRefs() };
}
