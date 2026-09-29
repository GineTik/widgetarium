import { createElement as h, useLayoutEffect, useRef } from "react";
import { leaseFor } from "./engine/render.js";

export function DrawnInShell({ shell, tree }) {
	const node = useShellDrawnInto(shell, tree);
	return h("div", { className: "wg-drawn", ref: node });
}

function useShellDrawnInto(shell, tree) {
	const node = useRef(null);
	useLayoutEffect(() => {
		if (shell.parentElement !== node.current) node.current.appendChild(shell);
		leaseFor(shell).draw(tree);
	});
	return node;
}
