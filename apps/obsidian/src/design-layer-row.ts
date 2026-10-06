import { createElement as h, useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { Layer, LayerKind } from "./layer-tree.js";
import { canHoldChildren } from "./layer-moves.js";
import type { DropPlace } from "./layer-moves.js";

export interface LayerRowProps {
	readonly layer: Layer;
	readonly depth: number;
	readonly isLocked: boolean;
	readonly onHover: (depth: number) => void;
	readonly onDrop: (dragged: string, target: string, place: DropPlace) => void;
}

const DRAGGED = "application/x-widgetarium-layer";
const INDENT_PX = 14;
const KIND_ICON: Readonly<Record<LayerKind, string>> = {
	widget: "puzzle",
	row: "columns-3",
	column: "rows-3",
	grid: "grid-2x2",
	group: "square",
	input: "text-cursor-input",
	button: "mouse-pointer-click",
	text: "type",
	picture: "image",
};

export function LayerRow({ layer, depth, isLocked, onHover, onDrop }: LayerRowProps): ReactElement {
	const [isOpen, setOpen] = useState(true);
	const [place, setPlace] = useState<DropPlace | null>(null);
	const isDraggable = layer.kind === "widget" || !isLocked;
	const hasChildren = layer.children.length > 0;
	return h("div", { className: "wg-design-layer-branch" }, [
		h(
			"div",
			{
				key: "row",
				className: `wg-design-layer-row${place ? ` is-drop-${place}` : ""}${layer.kind === "widget" ? " is-widget" : ""}`,
				style: { paddingLeft: `${depth * INDENT_PX + 6}px` },
				draggable: isDraggable,
				onMouseEnter: () => onHover(depth),
				onDragStart: (event: DragEvent) => event.dataTransfer.setData(DRAGGED, layer.mark),
				onDragOver: (event: DragEvent) => {
					event.preventDefault();
					onHover(depth);
					setPlace(dropPlaceOf(event, layer));
				},
				onDragLeave: () => setPlace(null),
				onDrop: (event: DragEvent) => {
					event.preventDefault();
					setPlace(null);
					const dragged = event.dataTransfer.getData(DRAGGED);
					if (dragged) onDrop(dragged, layer.mark, dropPlaceOf(event, layer));
				},
			},
			[
				h(
					"button",
					{ key: "open", className: "wg-design-layer-open", onClick: () => setOpen(!isOpen), disabled: !hasChildren },
					hasChildren ? h(Icon, { name: isOpen ? "chevron-down" : "chevron-right", size: 12 }) : null,
				),
				h(Icon, { key: "kind", name: KIND_ICON[layer.kind], size: 14 }),
				h("span", { key: "name", className: "wg-design-layer-name" }, layer.name),
				layer.repeats > 1 ? h("span", { key: "times", className: "wg-design-layer-times" }, `×${layer.repeats}`) : null,
			],
		),
		isOpen && hasChildren
			? h(
					"div",
					{ key: "children" },
					layer.children.map((child) =>
						h(LayerRow, { key: child.mark, layer: child, depth: depth + 1, isLocked, onHover, onDrop }),
					),
				)
			: null,
	]);
}

function dropPlaceOf(event: DragEvent, layer: Layer): DropPlace {
	const box = event.currentTarget.getBoundingClientRect();
	const share = (event.clientY - box.top) / Math.max(1, box.height);
	if (canHoldChildren(layer) && share > 0.3 && share < 0.7) return "inside";
	return share < 0.5 ? "before" : "after";
}
