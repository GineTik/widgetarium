import { leaseFor } from "./engine/render.js";
import type { Lease } from "./engine/render.js";
import { shieldFromEditor } from "./editor-shield.js";

export interface PortalMount {
	readonly node: HTMLDivElement;
	readonly draw: Lease["draw"];
	readonly dispose: () => void;
}

export function mountInto(anchor: Element, className?: string | null, onEscape?: (() => void) | null): PortalMount {
	const node = document.createElement("div");
	if (className) node.className = className;
	anchor.appendChild(node);
	shieldFromEditor(node);

	const onKey = (event: KeyboardEvent): void => {
		if (event.key === "Escape") onEscape?.();
	};
	if (onEscape) document.addEventListener("keydown", onKey);

	const { draw, release } = leaseFor(node);

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
