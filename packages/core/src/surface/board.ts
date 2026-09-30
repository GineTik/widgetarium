import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useBoardWidth } from "./use-board-width.js";

export interface BoardProps {
	readonly className?: string | undefined;
	readonly onWidth: (width: number) => void;
	readonly children?: ReactNode;
}

export function Board({ className, onWidth, children }: BoardProps): ReactElement {
	const rootRef = useBoardWidth(onWidth);
	return h("div", { className: className, ref: rootRef }, children);
}
