import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { FULL_STEP_SIDES, fullStepsIn } from "../utils/bare-content";
import { watchShapes, watchSizes } from "../utils/resize-watch";

const SHAPE_CHANGES: MutationObserverInit = {
	childList: true,
	subtree: true,
	attributes: true,
	attributeFilter: ["data-surface", "class"],
};

export function useFullStepForBareContent(plate: RefObject<Element | null>): void {
	useLayoutEffect(() => {
		const node = plate.current;
		if (!node) return undefined;
		const marked = new Set<Element>();
		const mark = (): void => markFullSteps(node, marked);
		mark();
		const stopShapes = watchShapes(node, SHAPE_CHANGES, mark);
		const stopSizes = watchSizes([node], mark);
		return () => {
			stopShapes();
			stopSizes();
			for (const each of marked) each.removeAttribute(FULL_STEP_SIDES);
		};
	}, []);
}

function markFullSteps(plate: Element, marked: Set<Element>): void {
	if (marked.size === 0 && !plate.matches('[data-surface="group"]')) return;
	const steps = new Map(fullStepsIn(plate).map((step) => [step.node, step.sides]));
	for (const node of marked) {
		if (steps.has(node)) continue;
		node.removeAttribute(FULL_STEP_SIDES);
		marked.delete(node);
	}
	for (const [node, sides] of steps) {
		if (node.getAttribute(FULL_STEP_SIDES) !== sides) node.setAttribute(FULL_STEP_SIDES, sides);
		marked.add(node);
	}
}
