import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useBoardWidth } from "./use-board-width.js";
import { CatalogueAsker } from "../engine/catalogue-asker.js";

export interface BoardProps {
	readonly className?: string | undefined;
	readonly onWidth: (width: number) => void;
	readonly children?: ReactNode;
}

export function Board({ className, onWidth, children }: BoardProps): ReactElement {
	const rootRef = useBoardWidth(onWidth);
	return h(CatalogueAsker.Provider, { value: rootRef }, h("div", { className: className, ref: rootRef }, children));
}
