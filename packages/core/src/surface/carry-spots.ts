import { COLUMN } from "../tree.js";
import type { NodePath } from "../tree-nodes.js";
import type { Rect, Spot } from "../tree-drop.js";

export type RegionRoots = Iterable<readonly [number, HTMLElement]>;

export function spotsIn(roots: RegionRoots, carriedId: string): Spot[] {
	return [...roots].flatMap(([, node]) => spotsUnder(node, carriedId));
}

// TRADE-OFF: the region element is a spot of its own over the same path as the box inside it, so the bare part of a column below its widgets still answers the pointer
function spotsUnder(node: HTMLElement, carriedId: string): Spot[] {
	const inside = [...node.querySelectorAll<HTMLElement>("[data-path]")]
		.filter((one) => one.dataset["cell"] !== carriedId)
		.map((one): Spot => ({
			path: pathFrom(one.dataset["path"] ?? ""),
			kind: one.dataset["cell"] === undefined ? "box" : "leaf",
			dir: one.dataset["dir"] ?? null,
			box: spotBox(one),
		}))
		.filter(standsOnScreen);
	const region = node.dataset["region"];
	if (region === undefined) return inside;
	return [
		...inside,
		{
			path: pathFrom(region),
			kind: "box",
			dir: node.querySelector<HTMLElement>("[data-dir]")?.dataset["dir"] ?? COLUMN,
			box: spotBox(node),
		},
	];
}

function pathFrom(key: string): NodePath {
	return key === "" ? [] : key.split("/").map(Number);
}

function spotBox(node: Element): Rect {
	const at = node.getBoundingClientRect();
	return { left: at.left, top: at.top, right: at.right, bottom: at.bottom };
}

function standsOnScreen(spot: Spot): boolean {
	return spot.box.right > spot.box.left && spot.box.bottom > spot.box.top;
}
