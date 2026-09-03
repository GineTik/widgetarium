import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const roots = new WeakMap();

function rootFor(node) {
	const root = roots.get(node) ?? createRoot(node);
	roots.set(node, root);
	return root;
}

function drop(node, take) {
	const existing = roots.get(node);
	if (!existing) return;
	roots.delete(node);
	take(existing);
}

export function render(tree, node) {
	if (tree === null || tree === undefined) {
		drop(node, (root) => {
			flushSync(() => root.render(null));
			root.unmount();
		});
		return;
	}
	const root = rootFor(node);
	flushSync(() => root.render(tree));
}

export function renderLater(tree, node) {
	if (tree === null || tree === undefined) {
		drop(node, (root) => queueMicrotask(() => root.unmount()));
		return;
	}
	rootFor(node).render(tree);
}
