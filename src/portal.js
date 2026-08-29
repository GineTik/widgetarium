import { render } from "preact";
import { shieldFromEditor } from "./editor-shield.js";

export function mountInto(anchor, className, onEscape) {
	const node = document.createElement("div");
	if (className) node.className = className;
	anchor.appendChild(node);
	// the expanded board is mounted OUTSIDE the code block, so it needs its own shield: a
	// click here would otherwise move the editor's caret, rebuild the block and take the
	// page down with it
	shieldFromEditor(node);

	const onKey = (event) => event.key === "Escape" && onEscape?.();
	if (onEscape) document.addEventListener("keydown", onKey);

	return {
		draw: (tree) => render(tree, node),
		dispose: () => {
			if (onEscape) document.removeEventListener("keydown", onKey);
			render(null, node);
			node.remove();
		},
	};
}
