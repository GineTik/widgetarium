import { useEffect, useMemo, useRef } from "react";

export interface MenuChildren {
	readonly openChild: (closeChild: () => void) => void;
	readonly closeChildren: () => void;
}

export function useMenuChildren(isOpen: boolean): MenuChildren {
	const closeOpenChild = useRef<(() => void) | null>(null);
	const children = useMemo<MenuChildren>(
		() => ({
			openChild: (closeChild) => {
				if (closeOpenChild.current !== closeChild) closeOpenChild.current?.();
				closeOpenChild.current = closeChild;
			},
			closeChildren: () => {
				const closeChild = closeOpenChild.current;
				closeOpenChild.current = null;
				closeChild?.();
			},
		}),
		[],
	);
	useEffect(() => {
		if (!isOpen) children.closeChildren();
	}, [isOpen]);
	return children;
}
