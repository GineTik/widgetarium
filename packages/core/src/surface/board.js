import { createElement as h } from "react";
import { useBoardWidth } from "./use-board-width.js";

export function Board({ className, onWidth, children }) {
	const rootRef = useBoardWidth(onWidth);
	return h("div", { className: className, ref: rootRef }, children);
}
