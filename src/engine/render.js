import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

// CONTEXT: a root may be created once per container, and unmounting loses it
const roots = new WeakMap();

// CONTEXT: React commits on a task, and every surface here measures the DOM on the next line
function commit(root, tree) {
	flushSync(() => root.render(tree));
}

export function render(tree, node) {
	if (tree === null || tree === undefined) {
		const held = roots.get(node);
		if (!held) return;
		roots.delete(node);
		commit(held, null);
		held.unmount();
		return;
	}

	const root = roots.get(node) ?? createRoot(node);
	roots.set(node, root);
	commit(root, tree);
}
