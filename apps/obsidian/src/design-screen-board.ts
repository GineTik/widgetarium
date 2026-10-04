import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useStaticBoardIn } from "./use-static-board-in.js";
import type { StaticBoard } from "./use-static-board-in.js";

export function ScreenBoard(drawn: StaticBoard): ReactElement {
	const node = useRef<HTMLDivElement | null>(null);
	useStaticBoardIn(node, drawn);
	return h("div", { ref: node, className: "wg-mount wg-design-board" });
}
