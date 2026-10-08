import { useId, useRef } from "react";
import type { RefObject } from "react";
import type { FocusIntent, MenuFamily, MenuState } from "../components/menu-context";
import { isInMenuTree } from "../components/menu-context";
import type { AnchorBox } from "../constants/popover";
import { boxOf } from "../utils/floating-placement";
import { useMenuNode } from "./use-menu-node";
import type { OpenAsk } from "./use-open-state";

export interface MenuRootAsk extends OpenAsk {
	readonly family: MenuFamily;
	readonly anchorBox?: (() => AnchorBox | null) | undefined;
	readonly focusIntent?: RefObject<FocusIntent> | undefined;
	readonly isAlsoInside?: ((node: Node) => boolean) | undefined;
}

interface RootBounds {
	readonly treeId: string;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly isAlsoInside: ((node: Node) => boolean) | undefined;
}

export function useMenuRoot(ask: MenuRootAsk): MenuState {
	const { closeSelf, ...node } = useMenuNode(ask);
	const ownIntent = useRef<FocusIntent>("panel");
	const treeId = useId();
	return {
		...node,
		family: ask.family,
		treeId,
		closeTree: closeSelf,
		anchorBox: ask.anchorBox ?? boxOf(node.triggerRef),
		focusIntent: ask.focusIntent ?? ownIntent,
		isInside: isInsideRootMenuOf({ treeId, triggerRef: node.triggerRef, isAlsoInside: ask.isAlsoInside }),
		parent: null,
	};
}

function isInsideRootMenuOf({ treeId, triggerRef, isAlsoInside }: RootBounds): (node: Node) => boolean {
	return (node) =>
		isInMenuTree(node, treeId) || Boolean(triggerRef.current?.contains(node)) || Boolean(isAlsoInside?.(node));
}
