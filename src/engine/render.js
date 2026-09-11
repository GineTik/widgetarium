import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const roots = new WeakMap();
const awaitingRelease = new WeakSet();

function rootFor(node) {
	awaitingRelease.delete(node);
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

function releaseLater(node) {
	const root = roots.get(node);
	if (!root) return;
	awaitingRelease.add(node);
	queueMicrotask(() => {
		if (!awaitingRelease.delete(node)) return;
		if (roots.get(node) !== root) return;
		roots.delete(node);
		root.unmount();
	});
}

function renderLater(tree, node) {
	if (tree === null || tree === undefined) {
		releaseLater(node);
		return;
	}
	rootFor(node).render(tree);
}

export function sessionAt(node) {
	return {
		draw: (tree) => renderLater(tree, node),
		release: () => releaseLater(node),
	};
}
