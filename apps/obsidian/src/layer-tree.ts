import { HELD_MARK, NODE_MARK, SCOPE_MARK, WIDGET_MARK } from "@widgetarium/core/engine/node-marks.js";

export type LayerKind = "widget" | "row" | "column" | "grid" | "group" | "input" | "button" | "text" | "picture";

export interface Layer {
	readonly mark: string;
	readonly kind: LayerKind;
	readonly name: string;
	readonly widget?: string | undefined;
	readonly repeats: number;
	readonly isHeld: boolean;
	readonly scope: string;
	readonly children: readonly Layer[];
}

const NAMED_BY = "data-name";
const INPUT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
const TEXT_TAGS = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "B", "STRONG", "LABEL"];
const KIND_SAID: Readonly<Record<LayerKind, string>> = {
	widget: "Widget",
	row: "Row",
	column: "Column",
	grid: "Grid",
	group: "Group",
	input: "Field",
	button: "Button",
	text: "Text",
	picture: "Picture",
};

export function layersIn(root: Element): Layer[] {
	return mergedRepeats([...root.children].flatMap(layersOf));
}

function layersOf(element: Element): Layer[] {
	const mark = element.getAttribute(NODE_MARK);
	const widget = element.getAttribute(WIDGET_MARK);
	if (widget)
		return mark
			? [
					{
						mark,
						kind: "widget",
						name: element.getAttribute(NAMED_BY) ?? widget,
						widget,
						repeats: 1,
						isHeld: element.hasAttribute(HELD_MARK),
						scope: element.getAttribute(SCOPE_MARK) ?? "",
						children: [],
					},
				]
			: [];
	const children = mergedRepeats([...element.children].flatMap(layersOf));
	if (!mark) return children;
	const kind = kindOf(element);
	return [
		{
			mark,
			kind,
			name: element.getAttribute(NAMED_BY) ?? KIND_SAID[kind],
			repeats: 1,
			isHeld: element.hasAttribute(HELD_MARK),
			scope: element.getAttribute(SCOPE_MARK) ?? "",
			children,
		},
	];
}

function kindOf(element: Element): LayerKind {
	if (INPUT_TAGS.includes(element.tagName)) return "input";
	if (element.tagName === "BUTTON") return "button";
	if (element.tagName === "IMG") return "picture";
	if (TEXT_TAGS.includes(element.tagName) && element.children.length === 0) return "text";
	const style = element.ownerDocument.defaultView?.getComputedStyle(element);
	if (style?.display.includes("grid")) return "grid";
	if (style?.display.includes("flex")) return style.flexDirection.startsWith("column") ? "column" : "row";
	return "group";
}

function mergedRepeats(layers: readonly Layer[]): Layer[] {
	const merged: Layer[] = [];
	for (const layer of layers) {
		const last = merged[merged.length - 1];
		if (last?.mark === layer.mark) merged[merged.length - 1] = { ...last, repeats: last.repeats + 1 };
		else merged.push(layer);
	}
	return merged;
}
