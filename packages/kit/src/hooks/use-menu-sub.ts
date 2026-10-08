import { useRef } from "react";
import type { FocusIntent, MenuState } from "../components/menu-context";
import { useMenu } from "../components/menu-context";
import { boxOf } from "../utils/floating-placement";
import { useMenuNode } from "./use-menu-node";
import type { OpenAsk } from "./use-open-state";

type InheritedFromParent = Pick<MenuState, "family" | "treeId" | "closeTree" | "isInside">;

type SetOpen = (open: boolean) => void;

export function useMenuSub(ask: OpenAsk): MenuState {
	const parent = useMenu();
	const { closeSelf, setOpen, ...node } = useMenuNode(ask);
	const focusIntent = useRef<FocusIntent>("none");
	return {
		...node,
		...inheritedFrom(parent),
		setOpen: subMenuSetOpen(parent, closeSelf, setOpen),
		anchorBox: boxOf(node.triggerRef),
		focusIntent,
		parent,
	};
}

function inheritedFrom({ family, treeId, closeTree, isInside }: MenuState): InheritedFromParent {
	return { family, treeId, closeTree, isInside };
}

function subMenuSetOpen(parent: MenuState, closeSelf: () => void, setOpen: SetOpen): SetOpen {
	return (next) => {
		if (!next) {
			closeSelf();
			return;
		}
		parent.openChild(closeSelf);
		setOpen(true);
	};
}
