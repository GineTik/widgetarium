import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { flushSync } from "react-dom";

export interface Lease {
	draw(tree: ReactNode): void;
	release(): void;
}

const roots = new WeakMap<Element, Root>();
const awaitingRelease = new WeakSet<Element>();

export function render(tree: ReactNode, node: Element): void {
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

export function leaseFor(node: Element): Lease {
	const release = (): void => releaseLater(node);
	return {
		draw: (tree) => (tree === null || tree === undefined ? release() : rootFor(node).render(tree)),
		release,
	};
}

function rootFor(node: Element): Root {
	awaitingRelease.delete(node);
	const root = roots.get(node) ?? createRoot(node);
	roots.set(node, root);
	return root;
}

function drop(node: Element, take: (root: Root) => void): void {
	const existing = roots.get(node);
	if (!existing) return;
	roots.delete(node);
	take(existing);
}

function releaseLater(node: Element): void {
	const root = roots.get(node);
	if (!root) return;
	awaitingRelease.add(node);
	queueMicrotask(() => {
		if (!awaitingRelease.delete(node)) return;
		if (roots.get(node) !== root) return;
		drop(node, (existing) => existing.unmount());
	});
}
