import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";

export interface MenuChildren {
	readonly openChild: (closeChild: () => void) => void;
	readonly closeChildren: () => void;
}

type CloseOpenChild = RefObject<(() => void) | null>;

export function useMenuChildren(isOpen: boolean): MenuChildren {
	const closeOpenChild = useRef<(() => void) | null>(null);
	const children = useMemo(() => createMenuChildren(closeOpenChild), []);
	useEffect(() => {
		if (!isOpen) children.closeChildren();
	}, [isOpen]);
	return children;
}

function createMenuChildren(closeOpenChild: CloseOpenChild): MenuChildren {
	return {
		openChild: (closeChild) => {
			if (closeOpenChild.current !== closeChild) closeOpenChild.current?.();
			closeOpenChild.current = closeChild;
		},
		closeChildren: () => {
			const closeChild = closeOpenChild.current;
			closeOpenChild.current = null;
			closeChild?.();
		},
	};
}
