import { createElement as h, useLayoutEffect, useRef } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { leaseFor } from "./engine/render.js";

export interface DrawnInShellProps {
	readonly shell: HTMLElement;
	readonly tree: ReactNode;
}

export function DrawnInShell({ shell, tree }: DrawnInShellProps): ReactElement {
	const node = useShellDrawnInto(shell, tree);
	return h("div", { className: "wg-drawn", ref: node });
}

function useShellDrawnInto(shell: HTMLElement, tree: ReactNode): RefObject<HTMLDivElement | null> {
	const node = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const holder = node.current;
		if (holder && shell.parentElement !== holder) holder.appendChild(shell);
		leaseFor(shell).draw(tree);
	});
	return node;
}
