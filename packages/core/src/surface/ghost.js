import { createElement as h } from "react";

export const LANDING_MS = 190;

export function ghostElement(carry, named, ghostRef) {
	if (!carry?.ghost) return null;
	return h(
		"div",
		{ className: "wg-tree-ghost", ref: ghostRef, key: "ghost", style: ghostBox(carry) },
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

export function flyGhostHome(page, ghost, carry) {
	if (!page || !ghost) return;
	const home = page.querySelector(`.wg-tree-cell[data-cell="${carry.id}"]`)?.getBoundingClientRect();
	if (!home) return;
	const at = page.getBoundingClientRect();
	ghost.style.transition = `transform ${LANDING_MS}ms cubic-bezier(0.2, 0, 0, 1), opacity ${LANDING_MS}ms linear`;
	ghost.style.transform = `translate(${home.left - at.left - carry.ghost.left}px, ${home.top - at.top - carry.ghost.top}px)`;
	ghost.style.opacity = "0";
}

function ghostBox(carry) {
	return {
		left: `${carry.ghost.left}px`,
		top: `${carry.ghost.top}px`,
		width: `${carry.ghost.across}px`,
		height: `${carry.ghost.down}px`,
		"--wg-ghost-lifted-from": carry.ghost.liftedFrom,
	};
}
