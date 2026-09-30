import { createElement as h } from "react";
import type { CSSProperties, ReactElement, RefObject } from "react";
import type { Carry } from "./carry.js";

export const LANDING_MS = 190;

type GhostStyle = CSSProperties & { readonly "--wg-ghost-lifted-from": number };

export function ghostElement(
	carry: Carry | null | undefined,
	named: string | undefined,
	ghostRef: RefObject<HTMLDivElement | null>,
): ReactElement | null {
	if (!carry?.ghost) return null;
	return h(
		"div",
		{ className: "wg-tree-ghost", ref: ghostRef, key: "ghost", style: ghostBox(carry.ghost) },
		h(
			"div",
			{
				className: "wg-tree-ghost-plate",
				style: { transformOrigin: `${carry.ghost.gripAcross * 100}% ${carry.ghost.gripDown * 100}%` },
			},
			h("b", null, named),
		),
	);
}

export function flyGhostHome(page: HTMLElement | null, ghost: HTMLElement | null, carry: Carry): void {
	if (!page || !ghost) return;
	const home = page.querySelector(`.wg-tree-cell[data-cell="${carry.id}"]`)?.getBoundingClientRect();
	if (!home) return;
	const at = page.getBoundingClientRect();
	ghost.style.transition = `transform ${LANDING_MS}ms cubic-bezier(0.2, 0, 0, 1), opacity ${LANDING_MS}ms linear`;
	ghost.style.transform = `translate(${home.left - at.left - carry.ghost.left}px, ${home.top - at.top - carry.ghost.top}px)`;
	ghost.style.opacity = "0";
}

function ghostBox(ghost: Carry["ghost"]): GhostStyle {
	return {
		left: `${ghost.left}px`,
		top: `${ghost.top}px`,
		width: `${ghost.across}px`,
		height: `${ghost.down}px`,
		"--wg-ghost-lifted-from": ghost.liftedFrom,
	};
}
