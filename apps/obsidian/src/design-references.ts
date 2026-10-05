import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { MARGIN_PX } from "./design-canvas-shapes.js";
import type { DrawnReference } from "./design-canvas-shapes.js";

export const REFERENCE_PX = 640;
const REFERENCES_SAID = "References · {count}";

export interface ReferencesLaneProps {
	readonly references: readonly DrawnReference[];
	readonly onWidth: (width: number) => void;
}

export function ReferencesLane({ references, onWidth }: ReferencesLaneProps): ReactElement | null {
	const [lane, setLane] = useState<HTMLDivElement | null>(null);
	useWritesWidth(lane, onWidth);
	if (references.length === 0) return null;
	const style = { left: `${MARGIN_PX}px`, top: `${MARGIN_PX}px` };
	return h("div", { className: "wg-design-references", style, ref: setLane }, [
		h(
			"div",
			{ key: "top", className: "wg-design-top" },
			h("span", { className: "wg-design-name" }, REFERENCES_SAID.replace("{count}", String(references.length))),
		),
		h(
			"div",
			{ key: "row", className: "wg-design-reference-row", style: { height: `${REFERENCE_PX}px` } },
			references.map((reference) =>
				h("figure", { key: reference.name, className: "wg-design-reference" }, [
					h("img", { key: "img", src: reference.src, alt: reference.why ?? reference.name, draggable: false }),
					reference.why ? h("figcaption", { key: "why" }, reference.why) : null,
				]),
			),
		),
	]);
}

function useWritesWidth(watched: HTMLDivElement | null, onWidth: (width: number) => void): void {
	useEffect(() => {
		if (!watched) return onWidth(0);
		const measure = (): void => onWidth(watched.offsetWidth);
		const watcher = new ResizeObserver(measure);
		watcher.observe(watched);
		measure();
		return () => watcher.disconnect();
	}, [watched, onWidth]);
}
