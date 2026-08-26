import { render } from "preact";

export function mountInto(anchor, className, onEscape) {
	const node = document.createElement("div");
	if (className) node.className = className;
	anchor.appendChild(node);

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
