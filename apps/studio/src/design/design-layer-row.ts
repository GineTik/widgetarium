import { createElement as h, useEffect, useState } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { Layer, LayerKind } from "./layer-tree.js";
import { canHoldChildren } from "./layer-moves.js";
import type { LayerDrag } from "./design-layer-drag.js";
import { foldOf } from "../assistant/cards/spec-rows.js";
import { Tip } from "./design-tip.js";

export interface LayerRowProps {
	readonly layer: Layer;
	readonly depth: number;
	readonly isLocked: boolean;
	readonly picked: string | null;
	readonly opened: ReadonlySet<string>;
	readonly drag: LayerDrag;
	readonly onPick: (mark: string) => void;
	readonly onHover: (depth: number) => void;
}

const INDENT_PX = 14;
const HELD_SAID = "Handed to a component as a prop, so it stays where it is";
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

export function LayerRow(props: LayerRowProps): ReactElement {
	const { layer, depth, isLocked, picked, opened, drag, onPick, onHover } = props;
	const [isOpen, setOpen] = useOpenedWhenHoldingPicked(opened.has(layer.mark));
	const isDraggable = !layer.isHeld && (layer.kind === "widget" || !isLocked);
	const hasChildren = layer.children.length > 0;
	return h("div", { className: "wg-design-layer-branch" }, [
		h(
			"div",
			{
				key: "row",
				className: rowClassOf(layer, picked, isDraggable),
				style: { paddingLeft: `${depth * INDENT_PX + 6}px` },
				"data-mark": layer.mark,
				"data-depth": depth,
				"data-can-hold": canHoldChildren(layer),
				"data-held": layer.isHeld,
				"data-scope": layer.scope,
				onMouseEnter: () => onHover(depth),
				onPointerDown: (event: PointerEvent) => {
					drag.onPointerDown(event, layer.mark, isDraggable);
				},
				onClick: () => {
					if (!drag.wasDragged()) onPick(layer.mark);
				},
			},
			[
				openerOf(hasChildren, isOpen, () => setOpen(!isOpen)),
				h(Icon, { key: "kind", name: KIND_ICON[layer.kind], size: 14 }),
				nameOf(layer),
				layer.repeats > 1 ? h("span", { key: "times", className: "wg-design-layer-times" }, `×${layer.repeats}`) : null,
			],
		),
		hasChildren
			? foldOf(
					isOpen,
					layer.children.map((child) => h(LayerRow, { ...props, key: child.mark, layer: child, depth: depth + 1 })),
				)
			: null,
	]);
}

function useOpenedWhenHoldingPicked(holdsPicked: boolean): [boolean, (isOpen: boolean) => void] {
	const [isOpen, setOpen] = useState(true);
	useEffect(() => {
		if (holdsPicked) setOpen(true);
	}, [holdsPicked]);
	return [isOpen, setOpen];
}

function rowClassOf(layer: Layer, picked: string | null, isDraggable: boolean): string {
	const kind = layer.kind === "widget" ? " is-widget" : "";
	const pick = picked === layer.mark ? " is-picked" : "";
	const still = isDraggable ? "" : " is-still";
	return `wg-design-layer-row${kind}${pick}${still}`;
}

function openerOf(hasChildren: boolean, isOpen: boolean, onToggle: () => void): ReactElement {
	if (!hasChildren) return h("span", { key: "open", className: "wg-design-layer-open" });
	return h(
		"button",
		{
			key: "open",
			type: "button",
			className: "wg-design-layer-open is-pressable",
			"aria-expanded": isOpen,
			onPointerDown: (event: PointerEvent) => event.stopPropagation(),
			onClick: (event: MouseEvent) => {
				event.stopPropagation();
				onToggle();
			},
		},
		h(Icon, {
			name: "chevron-down",
			size: 12,
			className: isOpen ? "wg-design-layer-chevron" : "wg-design-layer-chevron is-shut",
		}),
	);
}

function nameOf(layer: Layer): ReactElement {
	const name = h("span", { key: "name", className: "wg-design-layer-name" }, layer.name);
	return layer.isHeld ? h(Tip, { key: "name", label: HELD_SAID }, name) : name;
}
