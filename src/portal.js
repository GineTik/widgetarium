import { sessionAt } from "./engine/render.js";
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

	const { draw, release } = sessionAt(node);

	// CONTEXT: `node` is handed back so a caller can animate the mount out before disposing it
	return {
		node,
		draw,
		dispose: () => {
			if (onEscape) document.removeEventListener("keydown", onKey);
			release();
			node.remove();
		},
	};
}
